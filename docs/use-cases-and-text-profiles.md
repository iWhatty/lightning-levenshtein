# Levenshtein Use Cases and Text Profiles

## Purpose

Lightning Levenshtein should let operators choose the smallest representation that is correct for their domain. That choice must be explicit: edit distance is defined over a sequence of symbols, and changing the symbol unit changes the answer.

The project should therefore treat text preparation, symbol semantics, PEQ width, and parallelism as related but separate decisions. It should not silently scan, normalize, transliterate, or change modes inside the production hot loop.

## Where Levenshtein Distance Is Used

| Domain | Typical comparison unit | Typical alphabet | Operational notes |
| --- | --- | --- | --- |
| Search, autocomplete, and spelling correction | characters within short terms | controlled ASCII through multilingual Unicode | Elasticsearch fuzzy queries use edit distance to expand similar terms. Spelling systems often use bounded distances of one or two. The appropriate alphabet follows the indexed language and its analyzer, not a universal default. |
| Database fuzzy matching and entity resolution | characters within names, addresses, identifiers, or catalog fields | domain- and locale-dependent | PostgreSQL exposes Levenshtein for arbitrary strings and explicitly supports multibyte data. An ASCII profile can be correct for controlled identifiers; it is generally unsafe as an unstated assumption for human names. |
| OCR and transcription evaluation | characters or pre-tokenized words | document language, or dense token IDs | Character error rate operates on textual symbols. Word error rate aligns word tokens, so a token-ID sequence can be more direct and memory-efficient than treating the transcript as characters. |
| DNA and protein comparison | bases or amino-acid symbols | tiny ASCII alphabets | DNA commonly uses `A`, `C`, `G`, `T`, plus ambiguity symbols; proteins use a small amino-acid alphabet. Real bioinformatics often needs weighted, local, or semi-global alignment, but exact edit distance remains a useful primitive. |
| Deduplication, record linkage, and catalog cleanup | characters or field-specific tokens | often constrained after canonicalization | Operators commonly know field rules: SKU, postcode, username, or normalized title. Different fields may deserve different profiles in the same application. |
| Source, protocol, and machine-generated identifiers | bytes or restricted characters | ASCII, Latin-1, or a declared protocol vocabulary | Validation is usually preferable to fallback because an out-of-profile symbol often indicates malformed input. |

These are documented uses, not claims that plain Levenshtein is always the complete domain solution:

- [Elasticsearch fuzzy query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-fuzzy-query) measures term similarity with edit distance and exposes a small fuzziness bound.
- [PostgreSQL `fuzzystrmatch`](https://www.postgresql.org/docs/current/fuzzystrmatch.html) provides exact and bounded Levenshtein functions and supports multibyte strings.
- [NIST speech-recognition evaluation](https://www.nist.gov/system/files/documents/2019/02/06/opensat19_evaluation_plan_v3_2-6-19.pdf) aligns transcript tokens with Levenshtein-style dynamic programming to compute word error rate.
- Berger, Waterman, and Yu describe the central role of edit distance in [biological sequence comparison and database search](https://pmc.ncbi.nlm.nih.gov/articles/PMC8274556/), while also explaining why biological work often generalizes the scoring model.
- Arabic spelling-correction research provides one concrete multilingual example of generating candidates within [Levenshtein distance one or two](https://aclanthology.org/C12-2011.pdf).

## Encoding Is Not the Comparison Unit

JavaScript strings are sequences of 16-bit unsigned values. `String.prototype.charCodeAt` returns one UTF-16 code unit in the range `0..65535`; supplementary code points are represented by two code units. This is the behavior specified by [ECMAScript](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.charcodeat).

Consequently:

- The current string kernels calculate distance over UTF-16 code units.
- A 65,536-entry PEQ table covers every possible code-unit value, not every Unicode code point as one indivisible symbol.
- Emoji and other supplementary characters can contribute two edits because they use surrogate pairs.
- A code-point-aware mode would require decoding the string and operating on values up to `0x10FFFF`.
- A user-perceived-character mode would require grapheme segmentation. Unicode notes that grapheme clusters are the practical approximation for user-perceived characters and can still require language-specific tailoring; see [UAX #29](https://unicode.org/reports/tr29/).

UTF-8 is an external byte encoding, not a JavaScript string indexing mode. `TextEncoder` produces UTF-8 bytes under the [WHATWG Encoding Standard](https://encoding.spec.whatwg.org/). Running edit distance on those bytes is valid, but it is **byte edit distance**: one non-ASCII code point may occupy several bytes and therefore contribute several edits. It should not be presented as character distance.

## Normalization, Transliteration, and Validation

These operations are not interchangeable:

- **Unicode normalization** makes canonically or compatibly equivalent representations consistent. NFC can turn a base letter plus combining mark into a precomposed character when one exists. It does not generally remove accents, transliterate scripts to ASCII, or eliminate emoji. See [Unicode UAX #15](https://unicode.org/reports/tr15/).
- **Case folding** removes selected case distinctions. Locale and language rules matter outside controlled ASCII.
- **Transliteration** maps text between scripts or removes distinctions, such as mapping accented Latin letters to unaccented ASCII. This is application policy and can create collisions.
- **Validation** rejects symbols outside a declared vocabulary. This is often the right choice for identifiers, DNA, protocol fields, and already-canonicalized search indexes.
- **Tokenization** changes the unit from characters to words, phonemes, bases, or application-defined symbols.

The W3C string-matching model recommends choosing normalization and case behavior from the vocabulary’s actual requirements rather than applying one universal transformation. It also warns that ASCII-only folding is appropriate only when the vocabulary itself is restricted to ASCII; see [Character Model for the World Wide Web: String Matching](https://www.w3.org/TR/charmod-norm/).

A domain pipeline might therefore be:

```text
decode input
  -> apply domain canonicalization
  -> normalize/case-fold if the domain requires it
  -> validate or transliterate according to explicit policy
  -> tokenize or densely encode if applicable
  -> calculate distance with the matching profile
```

Lightning Levenshtein should document and support this pipeline, but should not silently choose its semantic steps.

## Current Repository Memory Model

A `Uint32Array` PEQ entry occupies four bytes. Module-level tables are allocated once per JavaScript module realm and reused by synchronous calls. Separate workers load separate module state, so table memory scales approximately with worker count.

### Per-table and v2 static PEQ memory

The current v2 source contains 24 PEQ lanes across its short, fixed-width, and generalized kernels.

| Direct code-unit range | Entries per lane | Bytes per lane | 24-lane v2 total |
| --- | ---: | ---: | ---: |
| ASCII | 128 | 512 B | 12 KiB |
| Latin-1 / byte-width | 256 | 1 KiB | 24 KiB |
| all UTF-16 code units | 65,536 | 256 KiB | 6 MiB |
| all Unicode code points | 1,114,112 | 4.25 MiB | 102 MiB |

The code-point row illustrates why a direct table is the wrong representation for that mode. A dense remapping or sparse structure would be required.

### Current entrypoints

- The default entrypoint is mixed-width. `peq.js` supplies one 256-entry table for the 32-bit and blockwise kernels, while the long-string `myers_x64` kernel owns two 65,536-entry tables. Static PEQ storage is therefore about **513 KiB**, plus small retained scratch buffers.
- The explicit `/unicode` entrypoint owns one 65,536-entry table: **256 KiB**, plus scratch buffers.
- The `/v2` entrypoint owns 24 65,536-entry lanes: **6 MiB**, plus scratch buffers retained by its generalized kernels.

These figures describe typed-array payloads and exclude JavaScript object, module, and allocator overhead. They also explain why worker count matters: eight workers loading v2 can account for roughly 48 MiB of PEQ payload alone.

The current README description of the default path as uniformly low-memory should eventually be refined because long inputs route to the two-lane wide kernel.

## Proposed Profile Semantics

### String profiles

Use names that describe the actual accepted code-unit range:

| Profile | Accepted string values | PEQ width | Intended use |
| --- | --- | ---: | --- |
| `ascii` | code units `0..127` | 128 | validated ASCII vocabularies and identifiers |
| `latin1` | code units `0..255` | 256 | Latin-1-style or deliberately reduced text |
| `codeUnit` | code units `0..65535` | 65,536 | arbitrary JavaScript strings with UTF-16 code-unit semantics |

`codeUnit` is more precise than `utf16`: it states what one edit means. The existing `/unicode` name can remain for compatibility while documentation explains that it is code-unit-complete, not code-point- or grapheme-aware.

### Dense token profiles

For DNA, proteins, transcript words, and arbitrary custom alphabets, accept a `Uint8Array`, `Uint16Array`, or other dense integer sequence with a declared maximum symbol value. A DNA encoder could map its alphabet to `0..4`, making a five-entry PEQ table possible. A word-error-rate pipeline could assign each distinct token a dense integer ID.

This is more memory-efficient than using a 65,536-entry character-to-token map inside every call. It also keeps domain preprocessing out of the hot loop.

### Byte profile

A byte profile should accept byte arrays directly. Callers may supply ASCII, a binary protocol, or UTF-8 produced by `TextEncoder`, but the API and documentation must call the result byte distance. It must not imply Unicode character semantics.

### Code-point and grapheme adapters

Code-point and grapheme-aware distance should be preprocessing adapters over dense token kernels, not direct-table string kernels. They have different length semantics and materially higher preparation cost. They should be measured independently before becoming public API.

## Configuration Shape

Configuration should happen once when selecting an entrypoint or creating an instance, not once per character and preferably not once per call.

Illustrative API only:

```js
const distanceAscii = createDistance({
  profile: "ascii",
  outOfRange: "throw"
});

const distanceLatin1Unchecked = createDistance({
  profile: "latin1",
  outOfRange: "assume-valid"
});

const distanceTokens = createTokenDistance({
  maxSymbol: 31
});
```

Recommended policies:

- `throw`: scan and reject out-of-profile input. Safe for boundary APIs, with an O(n) validation cost.
- `fallback`: scan and route to a wide implementation. Convenient but adds per-call work and requires the wide tables to remain resident, defeating the main memory goal.
- `assume-valid`: no scan and no hot-loop branch. Fastest and smallest, but correct only when the operator validates or constructs the data upstream.

An out-of-range typed-array access must never be an undocumented behavior: missing PEQ entries can silently produce incorrect distances.

For the stable core, factories can bind one table to the existing kernel factories. For v2, build-time generation of separate width variants is safer than inserting width checks into specialized loops. Export subpaths can then let bundlers include only the selected profile.

## Recommended Delivery Sequence

1. **Document and benchmark the baseline.** Measure module-load memory, retained typed-array memory, cold start, and throughput for the existing default, `/unicode`, and `/v2` entrypoints.
2. **Prototype core string factories.** Benchmark 128-, 256-, and 65,536-entry tables with `throw` and `assume-valid` policies. Prove that factory binding does not regress the inner loop.
3. **Parameterize v2 code generation.** Generate ASCII, Latin-1, and full code-unit kernels from shared templates. Verify every dispatch boundary for every width.
4. **Measure parallel scaling.** Run one, two, four, and eight workers while recording throughput, resident memory, typed-array memory, and startup time.
5. **Prototype dense token input.** Start with DNA and word-token fixtures because their semantics and alphabet sizes are clear.
6. **Consider public subpaths only after evidence.** Candidate names are `/ascii`, `/latin1`, `/unicode`, `/v2/ascii`, `/v2/latin1`, and `/v2/unicode`, with compatibility preserved for existing exports.
7. **Treat code-point and grapheme modes as separate products.** Their preprocessing and semantic costs should not be hidden behind a table-width flag.

## Recommendation

The operator should own semantic normalization and know the domain. Lightning Levenshtein should own fast, explicit sequence profiles; validation options; accurate memory documentation; and reproducible benchmarks.

The first implementation experiment should be ASCII/Latin-1/code-unit factories for the stable core, followed by generated v2 variants and worker-scaling measurements. A generic arbitrary-alphabet string map should not be the first design: dense token input provides clearer semantics, lower memory, and a cleaner hot path.

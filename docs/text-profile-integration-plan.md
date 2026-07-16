# Text Profile Integration Plan

## Objective

Add explicit, memory-tunable text profiles to the stable API first, while preserving the existing default, `/unicode`, and `/v2` behavior and performance. Keep v2 profile generation as a later project after the stable design is measured.

This plan implements the semantics in [Levenshtein Use Cases and Text Profiles](./use-cases-and-text-profiles.md). The `/profiles` source, minified bundle, declarations, and package exports are implemented in the repository; npm publication remains a separate release decision.

## Why Stable Core First

The stable runtime has three dispatch tiers:

1. `myers_32` for lengths through 32;
2. `myers_x` for lengths 33 through 64;
3. `myers_x64` for longer inputs.

All three now have table-bound factories. The long two-lane extraction retains the pre-bound legacy export and has a focused correctness and throughput spike. This makes the remaining stable-core prototype contained and keeps its policy costs measurable outside the kernels.

V2 statically imports seven kernel families containing 24 PEQ lanes. Supporting three widths there requires shared generation or factories across every dispatch boundary, new bundles, and a much larger benchmark matrix. Adding a runtime width branch to those loops would work against v2's purpose.

## Public Surface

Preserve the default API:

```js
import { distance, distanceMax, closest } from "lightning-levenshtein";
```

Use a separate, tree-shakeable subpath rather than growing `src/index.js`:

```js
import { createDistance } from "lightning-levenshtein/profiles";

const distanceAscii = createDistance({
  profile: "ascii",
  outOfRange: "throw"
});
```

Initial profiles:

- `ascii`: 128 PEQ entries, accepts code units `0..127`.
- `latin1`: 256 PEQ entries, accepts code units `0..255`.
- `codeUnit`: 65,536 PEQ entries, accepts every JavaScript code-unit value.

Initial policies:

- `throw`: validate both strings once per call and reject out-of-profile input.
- `assume-valid`: perform no validation and document the operator precondition.

Do not ship `fallback` initially. A fallback implementation must retain wide tables and scan every call, undermining both the memory and throughput objectives.

Do not call any profile `utf8`. A later byte-sequence API may accept UTF-8 bytes, but its result is byte distance.

## Runtime Architecture

### Factory binding

Create the PEQ table once per returned distance function and bind it before entering the hot kernels:

```text
createDistance(options)
  -> allocate PEQ lane(s) for selected profile
  -> bind myers32 kernel
  -> bind blockwise kernel
  -> bind two-lane long kernel
  -> return validated or unchecked dispatcher
```

No profile or policy check belongs inside a Myers inner loop.

### Instance ownership

Each factory instance owns mutable PEQ and scratch state. Calls are synchronous and reuse that state. Separate workers create independent instances, making per-worker memory explicit. Creating many instances in one worker intentionally allocates many table sets and should be documented.

### Long-kernel extraction

Refactor `src/myers_x64.js` into a factory accepting two PEQ arrays, mirroring the existing core factories. Retain a module-bound export for the current default entrypoint so existing imports and bundles do not change behavior.

This was the highest-risk first step. Closure output, JIT behavior, long-input correctness, scratch-buffer ownership, and throughput remain delivery-gate evidence before promotion.

### Validation

Validation should run in the factory wrapper, not the dispatcher or kernels. The scan checks `charCodeAt(i) < tableWidth` for both inputs.

The unchecked policy must be named explicitly. Out-of-range typed-array access is not a safe implicit fallback and can produce incorrect distance values.

## Implemented File Scope

Production integration:

| Area | Implemented change |
| --- | --- |
| `src/myers_x64.js` | retain the existing public kernel through a new table-bound factory |
| `src/myers_x64_factory.js` | own two-lane kernel construction and instance scratch buffers |
| `src/distanceProfile.js` | create profile tables, validation wrappers, and stable dispatcher |
| `src/profiles.js` | new subpath entrypoint exporting `createDistance` |
| `dist/*profiles*.js` | pre-built Closure bundle for `/profiles/min` |
| `dist/*profiles*.d.ts` | public TypeScript declarations |
| `package.json` | explicit `./profiles` and `./profiles/min` exports |
| build scripts | independent profile bundle in `build:all` |
| package smoke scripts | verify exports, declarations, tarball installation, and exact file list |
| tests | profile correctness, validation, boundaries, and unchanged legacy behavior |
| benchmarks | throughput and worker-memory measurements |

The default `src/index.js` should remain limited to `distance`, `distanceMax`, and `closest`.

## Correctness Matrix

Every profile must be tested against a simple dynamic-programming reference at the existing kernel boundaries:

- equal strings and empty strings;
- lengths 1, 2, 3, 31, 32, 33, 63, 64, 65, 96, 128, and larger cases;
- insertions, deletions, substitutions, repeated symbols, prefixes, and suffixes;
- maximum in-profile code unit: 127, 255, or 65,535;
- first out-of-profile code unit under `throw`;
- unchecked inputs documented as a precondition, not tested as meaningful output;
- multiple factory instances in one realm to prove state isolation;
- source and any minified profile bundle;
- Node 18 and Node 24 package-install smoke tests.

Existing default, `/unicode`, and `/v2` tests must remain unchanged except for documentation wording.

## Performance and Memory Evidence

### Throughput matrix

Benchmark each profile with representative data rather than only random ASCII:

- ASCII identifiers and English search terms;
- Latin-1 words with code units near 255;
- BMP text with values above 255;
- lengths around every stable dispatcher boundary;
- `throw` versus `assume-valid`;
- default and `/unicode` as controls.

Measure cold and warmed performance. A factory should be constructed outside the timed loop.

### Worker matrix

Measure 1, 2, 4, and 8 workers for each profile. Record:

- aggregate operations per second;
- process resident set size;
- V8 heap statistics;
- `arrayBuffers`/external memory where available;
- module and factory startup time;
- retained memory after the largest tested input.

The expected static table trend is 512 bytes per ASCII lane, 1 KiB per Latin-1 lane, and 256 KiB per full code-unit lane. Measurements should confirm actual process-level effects rather than treating typed-array arithmetic as total memory.

## Dense Token Follow-Up

Do not force arbitrary alphabets through JavaScript string maps. Prototype a separate dense sequence API after the string profiles:

```js
const distanceTokens = createTokenDistance({ maxSymbol: 31 });
```

Candidate fixtures:

- DNA mapped to a small integer alphabet;
- protein symbols including ambiguity codes;
- phoneme IDs;
- transcript word IDs for word error rate;
- application-defined enum sequences.

The token kernel should specialize direct indexed access for typed arrays. Avoid a caller-provided `symbolAt` callback in the hot loop unless benchmarks prove its cost acceptable.

## V2 Follow-Up

V2 profiles should be generated at build time from shared templates or factories:

- `/v2/ascii`;
- `/v2/latin1`;
- existing `/v2` or `/v2/unicode` code-unit-complete behavior.

Promotion requires correctness at every v2 dispatch edge, reproducible package benchmarks, worker-memory evidence, and no inner-loop mode branch. Until then, v2 remains unchanged.

## Delivery Gates

1. **Complete — Factory spike:** table-bound `myers_x64` correctness and long-input throughput.
2. **Complete — Stable profile prototype:** ASCII, Latin-1, and code-unit factories across all stable tiers.
3. **Complete — Memory harness:** repeatable 1/2/4/8-worker measurements.
4. **Complete — API review:** `/profiles`, `createDistance`, safe `throw` default, and explicit `assume-valid` policy.
5. **Complete — Package integration:** declarations, source/min exports, build, smoke tests, and README examples.
6. **Open — Release decision:** npm publication and versioning remain maintainer actions.

### Factory Spike Status

The table-bound `myers_x64` extraction and focused benchmark live in `src/myers_x64_factory.js` and `bench/text-profile-spike/`. Correctness covers 128-, 256-, and 65,536-entry bindings plus isolated factory state. The initial Node 24 Windows run found no obvious long-input throughput regression; detailed conditions and directional ranges are recorded with the benchmark.

### Stable Profile Prototype Status

The dispatcher binds all three stable tiers for `ascii`, `latin1`, and `codeUnit`, with `throw` and `assume-valid` selected once at construction. Tests cover dispatch boundaries, maximum profile values, rejection before fast paths, configuration errors, symmetry, and instance isolation. Initial throughput shows unchecked dispatch close to current controls while per-call validation remains a measurable policy cost. It is exported only through `/profiles` and `/profiles/min`; the default API remains unchanged.

### Worker Harness Status

The isolated worker harness now covers 1, 2, 4, and 8 workers per profile in fresh child processes. It records concurrent throughput, sequential spawn-to-ready time, factory time, process RSS, worker heap/external memory, exact factory `arrayBuffers`, and retained buffers after touching every stable tier. Initial Node 24 Windows results confirm three-lane PEQ arithmetic and useful parallel scaling; cross-version and deployment-hardware repetitions remain necessary before capacity claims or API promotion.

## Complexity Assessment

The stable string-profile work is **moderate and well-contained**. Existing factories remove much of the risk. The two-lane long kernel and validation cost are the main unknowns.

Dense token input is a separate moderate experiment with strong potential for tiny domain alphabets.

V2 profile support is **substantially larger** because width affects 24 PEQ lanes and every specialized kernel. It should not block the stable-core experiment and should not be attempted as a casual refactor.

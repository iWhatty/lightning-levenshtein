# Slim Spike

Prototype of a distance entry point that keeps v2's short-string speed at close to the default entry point's cost: one full-width PEQ table (256 KiB) and about 11 KB of minified code.

## Why

Most of v2's memory and code is not needed for short strings:

- **Memory.** Production v2 allocates 24 private 65,536-entry lanes across seven kernel modules, 6 MiB per realm or worker, all at import. The default entry point allocates 513 KiB, because its long-string kernel owns two full-width lanes even when no long string is ever passed.
- **Code.** `src/v2/myers32-unrolledA.js` holds 32 generated copies of the 32-bit kernel, one per length. It is most of v2's 41.7 KB bundle.

Short-string workloads such as dictionary words, identifiers and tokens rarely go past 16 code units, so the unrolled kernels above 16 buy little there.

## The idea

`core/index.js` dispatches by the longer string's length, and every tier binds the same table:

| Length | Kernel |
| --- | --- |
| 0–2 | v2's closed-form shortcuts |
| 3–16 | v2's unrolled kernels (`myers_table[n]`) |
| 17–32 | the stable generic 32-bit kernel (`createMyers32`) |
| 33+ | the stable blockwise kernel (`createMyersX`) |

The table is full width, so every UTF-16 code unit is counted correctly, unlike the default entry point's 256-entry table. Calls are synchronous and each kernel clears what it set, so the tiers take turns on one table. Arguments are checked before any kernel runs, so a rejected call cannot leave the table dirty.

`derive-kernels.js` produces the other three files in `core/`. They are the v2 unrolled kernels for lengths 1–16 with their table exported, and byte-for-byte copies of the two stable factories. Kernel bodies are unchanged.

## Relation to the other spikes

| | Full-width lanes | Table memory | Covers |
| --- | ---: | ---: | --- |
| Production v2 | 24 | 6 MiB | every length, max throughput |
| [Shared PEQ pool](../shared-peq-spike/README.md) | 8 | 2 MiB | the same v2 kernels, pooled |
| [Default wide-table](../default-wide-spike/README.md) | 2 | 512 KiB | the default API (`distance`, `distanceMax`, `closest`), correct for every code unit |
| Slim (this spike) | 1 | 256 KiB | `distance` only, v2 speed up to 16 code units |

## Commands

Run from the repository root.

```bash
node bench/slim-spike/derive-kernels.js
node bench/slim-spike/derive-kernels.js --check
node bench/slim-spike/verify.js
node bench/slim-spike/measure-size.mjs --out-dir=<external-directory>
node bench/slim-spike/run-bench.js
```

- `verify.js` is correctness only. It checks slim against the dynamic-programming reference at the 2/3, 16/17 and 32/33 dispatch edges and the blockwise word edges, in both argument orders, for DNA, printable ASCII and full code-unit alphabets (including surrogates and `0xFFFF`). Calls are shuffled across tiers, the table must be zero after every call, and non-string input must throw without touching it.
- `measure-size.mjs` builds the spike with the production Closure pipeline into a directory outside the checkout. It reports bundle bytes and the typed-array memory each entry holds after import.
- `run-bench.js` is a paired throughput probe on the `bench/workloads.js` families. It prints to stdout and writes nothing.

## First measurements

These come from one Windows 10 desktop on Node 24.20.0, from a single run. They are a probe, not promotion evidence.

Size and memory:

| Entry | Minified | gzip | Tables after import |
| --- | ---: | ---: | ---: |
| Production default | 4,705 B | 2,130 B | 513 KiB |
| Production v2 | 41,664 B | 5,727 B | 6,144 KiB |
| Slim | 10,931 B | 1,525 B | 256 KiB |

Throughput relative to fastest-levenshtein (higher is better, median of 7 rotating rounds), for `exact-one-edit` and `random-ascii`:

| Length | Default | v2 | Slim |
| ---: | ---: | ---: | ---: |
| 4 | 1.20× / 0.73× | 1.37× / 1.02× | 1.28× / 0.96× |
| 8 | 1.26× / 0.82× | 1.51× / 1.13× | 1.46× / 1.08× |
| 12 | 1.28× / 0.89× | 1.68× / 1.27× | 1.68× / 1.26× |
| 16 | 1.29× / 0.99× | 1.69× / 1.34× | 1.50× / 1.30× |
| 24 | 1.39× / 1.08× | 1.64× / 1.45× | 1.42× / 1.15× |
| 32 | 1.52× / 1.12× | 1.63× / 1.51× | 1.43× / 1.18× |
| 64 | 1.31× / 1.19× | 2.16× / 1.83× | 1.28× / 1.20× |
| 128 | 1.48× / 1.48× | 1.92× / 1.89× | 1.10× / 1.16× |

What this shows so far:

- Up to 16 code units, slim keeps most of v2's lead over the default entry point, with a twenty-fourth of v2's table memory.
- From 17 to 32, slim falls to the generic 32-bit kernel's speed, between default and v2. Unrolling to 32 would close that gap for about 22 KB more code.
- Above 32, slim runs the stable blockwise kernel. It is behind default from 128 up, where default switches to its two-lane long kernel, and well behind v2's fixed-width kernels.
- The `exact-one-edit` row at 16 is partly the generic kernel. That family's insertions make 17-unit strings, which leave the unrolled tier, and that probably explains the gap to v2 there.
- On `bmp-code-units`, default looks slower, but its results there are wrong. Slim and v2 compute correct distances.

## Not yet established

- Repeated runs on a quiet host, other Node versions and other CPU families, following `docs/node-version-testing.md`.
- Process-level and worker memory through the worker-memory harness. The figures above are typed-array bytes only.
- Whether the right cut is 16, 24 or 32, and whether a long tier should use v2's two-lane `myers_64` or the default's long kernel (one or two more lanes).
- An API shape. This spike exposes `distance` only, with no `distanceMax` or `closest`, and it is not a public subpath.

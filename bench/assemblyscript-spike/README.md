# AssemblyScript / Wasm Spike Plan

This is a future sprint map for testing whether a Wasm-backed Levenshtein runtime is worth pursuing.

## Goal

Answer one question with benchmarks: can AssemblyScript or Wasm beat the current JavaScript runtime for realistic package use cases after string/memory crossing costs are included?

## Hypothesis

Wasm is unlikely to win for one-off tiny string calls because JS-to-Wasm crossing and string encoding overhead can dominate the work. It may win for batch workloads, large strings, dictionary search, or APIs that keep encoded data in Wasm memory across many comparisons.

## Full Wasm Direction

Going fully Wasm-first is possible, but it should not become the default package direction until benchmarks prove it. The main boundary is JavaScript strings: package users pass JS strings, while Wasm operates on linear memory. Each normal call needs to encode/copy string data into Wasm memory before the kernel can run.

```text
JS string -> encode/copy into Wasm memory -> run kernel -> return number
```

That boundary cost is likely too expensive for tiny one-off calls, where the current JavaScript kernels are already very fast. Full Wasm becomes more plausible when the cost is amortized across bigger work:

- batch search where the query is encoded once and compared against many candidates
- large strings where edit-distance computation dominates boundary overhead
- Unicode-correct modes over explicit UTF-16 code units or UTF-8 bytes
- server workloads where users accept setup/loading complexity for throughput

## Rust/Wasm vs AssemblyScript

AssemblyScript is the preferred first spike because it keeps the experiment close to the current JavaScript/TypeScript mental model and should be quick to wire into `bench/`.

Rust/Wasm may be the better long-term route if Wasm becomes a serious package direction. It has mature tooling, allocator control, good performance ergonomics, and a stronger path toward SIMD/native-style optimization. The tradeoff is more project complexity and a larger language/toolchain jump.

Treat this as a staged question:

1. Use AssemblyScript to prove whether the Wasm boundary can win at all.
2. If the AssemblyScript spike wins in meaningful workloads, consider a Rust/Wasm prototype for a second sprint.
3. Keep the default JavaScript runtime unless Wasm wins clearly and reproducibly for common use.

## Recommended Package Direction

The likely best architecture is hybrid:

```js
import { distance } from "lightning-levenshtein";
import { createWasmBatch } from "lightning-levenshtein/wasm";
```

Use JavaScript for normal single-call usage. Use Wasm for batch, large-string, or Unicode-heavy workloads if benchmarks prove it. This avoids charging every user the JS/Wasm boundary tax while still giving high-throughput users a stronger engine.

## Prototype Shape

- Keep the default JS runtime unchanged during the spike.
- Build the prototype entirely inside this folder first.
- Use AssemblyScript for the first version so the implementation remains close to TypeScript/JavaScript.
- Export a small Wasm API that operates on offsets and lengths in linear memory, not JS strings directly.
- Add a JS wrapper that encodes strings into Wasm memory and calls the exported kernel.
- Add a batch wrapper that encodes the query once and compares it against many candidates.

## Bench Targets

Compare against:

- `dist/lightning-levenshtein.min.js`
- `bench/lightning-levenshtein-v2.min.js`
- `fastest-levenshtein`

Initial workloads:

- single call, equal lengths: `1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024`
- batch query against candidate lists: `10, 100, 1000, 10000`
- ASCII alphabet first, then Unicode/large-code-unit inputs if the char-table mode spike has landed
- dictionary-search style workloads where `closest`-like behavior matters

## Success Criteria

Continue past the spike only if one of these is true:

- Wasm is faster than current JS for batch workloads after encoding costs.
- Wasm is meaningfully faster for large strings without hurting package ergonomics.
- Wasm provides a clean Unicode-correct path that performs well enough to justify a separate export.

Do not replace the default JS runtime unless the benchmark win is clear and reproducible.

## Candidate Public API

Keep this separate from the stable API unless benchmarks justify promotion:

```js
import { distanceWasm, createWasmBatch } from "lightning-levenshtein/wasm";
```

Possible batch shape:

```js
const batch = await createWasmBatch();
const best = batch.closest("query", candidates);
```

## Suggested Files For The Spike

```text
bench/assemblyscript-spike/
  README.md
  package.json
  assembly/
    index.ts
  src/
    wrapper.js
    run-bench.js
  build/
    lightning-levenshtein.wasm
```

Generated Wasm artifacts should stay out of the published package until the API and benchmark case are proven.

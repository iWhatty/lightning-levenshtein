# Technical Reflection

## Executive View

Lightning Levenshtein is no longer just one optimized implementation of Myers' algorithm. It is a portfolio of specialized kernels selected by input length and public entrypoint:

- generated, fully unrolled kernels for very short strings;
- fixed-width multiword kernels around important dispatch ranges;
- generalized 64- and 128-character macro-block fallbacks;
- stable, max-throughput, Unicode-width, and configurable-profile surfaces.

The project's strongest advantage is the development method behind that portfolio: isolate a hypothesis, generate or hand-build variants, compare them on identical data, prove correctness at boundaries, and only then promote a winner. That method is more durable than any single inner-loop trick.

## What Is Technically Distinctive

### Kernel specialization

Many JavaScript Levenshtein packages expose one dynamic-programming loop or one general Myers implementation. V2 instead treats input length as compile-time-like information at runtime. Its dispatcher selects generated short kernels, fixed 2/3/4/8-word kernels, or generalized macro-block kernels before entering the hot loop.

This resembles a small query optimizer: several correct execution strategies serve the same semantic operation, and dispatch chooses the expected cheapest strategy for the observed shape.

### Explicit memory and text semantics

The `/profiles` API makes character-table width an operator decision rather than an undocumented implementation accident. ASCII, Latin-1, and full JavaScript code-unit workloads have different PEQ payloads, validation costs, and safe operating assumptions.

The separation between code units, bytes, code points, graphemes, and dense tokens is equally important. A fast algorithm with ambiguous symbol semantics is difficult to use correctly; explicit profiles improve both performance control and developer experience.

### Evidence-backed promotion

Experiments remain in `bench/` or `codegen/` until they have correctness and throughput evidence. Checked-in benchmark settings, raw results, environment metadata, charts, generated source, package tests, and dispatch-boundary tests create a useful audit trail.

## Comparison with Common JavaScript Approaches

`fastest-levenshtein` shares the same broad Myers foundation: a 32-bit kernel followed by a general blockwise implementation backed by a full code-unit PEQ table. It is compact and general. Lightning differentiates itself through more aggressive length specialization, typed scratch reuse, macro-block variants, and separate memory/semantic profiles.

`js-levenshtein` and `leven` are optimized dynamic-programming implementations. They trim common prefixes and suffixes, reuse a row, and in some cases unroll several columns. Those implementations are elegant and competitive for selected tiny inputs, but their quadratic work grows more quickly than bit-parallel Myers on larger strings.

Lightning's tradeoff is complexity. The kernel portfolio can outperform a single general implementation, but every additional tier creates another dispatch boundary, code-generation obligation, correctness surface, and potential performance cliff.

## The Good

- The public default remains small: `distance`, `distanceMax`, and `closest`.
- V2 makes its larger code and memory footprint explicit.
- Profile selection occurs outside hot loops.
- Correctness tests concentrate on dispatch boundaries where specialized implementations are most fragile.
- Benchmark inputs are shared across targets and generated deterministically.
- Raw results include runtime and hardware metadata.
- Build, declaration, export, tarball, and exact-package-shape checks agree on the public surface.
- Claims in the README are scoped to the checked-in Node benchmark instead of presented as universal facts.

## The Bad

The primary package benchmark currently represents one narrow workload:

- equal-length inputs;
- random ASCII alphanumerics;
- predominantly high edit distance;
- Node.js 24;
- Windows on one Intel processor.

That workload is valid and reproducible, but it does not represent dictionary correction, shared-prefix search, identifiers with one edit, unequal lengths, repeated alphabets, multilingual code units, browsers, or every supported Node version.

Targets also run in a fixed order. Scheduler activity, JIT state, garbage collection, power management, and background load can therefore correlate with a library's position in the sequence. Cooling reduces thermal throttling risk but cannot remove those other effects.

## The Ugly

The optimization surface is large. Generated short kernels, fixed-width variants, generalized fallbacks, multiple entrypoints, mutable PEQ tables, and retained scratch buffers mean that a locally attractive change can be globally slower or wrong.

V2's 6 MiB static PEQ payload per worker is a real operational tradeoff. It is reasonable for an explicitly max-throughput entrypoint, but worker count must remain part of capacity planning.

Benchmark numbers can also become misleading when copied without their workload and environment. Absolute ops/sec from different machines must not be averaged together. Cross-platform evidence should compare rankings and within-machine ratios while preserving each machine's raw results independently.

## Claim Discipline

The strongest defensible claim is:

> `lightning-levenshtein-v2` records the highest mean throughput at every tested length in the checked-in Node benchmark.

That statement is supported by the current data and names its scope. "Fastest in the world" is not durable without specifying runtime, engine, hardware, input distribution, competitors, versions, and measurement protocol.

Future claims should always travel with:

- the exact commit and package versions;
- runtime, operating system, architecture, and CPU;
- workload family and alphabet;
- raw repetitions and aggregation method;
- a reproducible command and checked-in configuration.

## Design Principles Going Forward

1. Preserve the small default API and make expensive specialization opt-in.
2. Keep semantic preprocessing outside algorithm hot loops.
3. Prove new kernels in experiments before production promotion.
4. Treat dispatch boundaries as first-class correctness and performance targets.
5. Establish a machine's noise floor before defining regression thresholds.
6. Compare paired ratios within one run; do not pool absolute throughput across machines.
7. Prefer generated v2 variants over manually cloned kernels.
8. Pursue Wasm only through batch APIs that can amortize boundary overhead.
9. Treat dense token distance as a separate product for DNA, proteins, phonemes, and word-error-rate workloads.

## Current Judgment

The project has a credible technical foundation and an unusually good experimental culture for a small JavaScript package. Its main risk is no longer algorithmic weakness; it is allowing specialization, claims, and documentation to grow faster than the evidence and maintenance system around them.

The next leverage point is benchmark hardening: broaden workload coverage, reduce ordering bias, record repeated runs, and make cross-platform comparison disciplined without turning CI into a benchmark laboratory.

See [Benchmark Hardening Sprint](./benchmark-hardening-sprint.md) for the executable plan.

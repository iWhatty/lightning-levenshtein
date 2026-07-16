# ⚡ lightning-levenshtein

[![npm](https://img.shields.io/npm/v/lightning-levenshtein)](https://www.npmjs.com/package/lightning-levenshtein)
[![downloads](https://img.shields.io/npm/dm/lightning-levenshtein)](https://www.npmjs.com/package/lightning-levenshtein)
[![bundle size](https://img.shields.io/bundlephobia/minzip/lightning-levenshtein)](https://bundlephobia.com/package/lightning-levenshtein)
[![license](https://img.shields.io/npm/l/lightning-levenshtein)](https://github.com/iWhatty/lightning-levenshtein/blob/main/LICENSE)
[![stars](https://img.shields.io/github/stars/iWhatty/lightning-levenshtein?style=social)](https://github.com/iWhatty/lightning-levenshtein)
[![types](https://img.shields.io/npm/types/lightning-levenshtein)](https://www.npmjs.com/package/lightning-levenshtein)

Fast Levenshtein distance in pure JavaScript. Compact default API for general-purpose edit distance, plus opt-in subpaths for maximum throughput and Unicode-width character tables.

## Features

- Specialized kernels for very short strings
- Precompiled bit-parallel dispatch for short inputs
- Fixed-width Myers variants for medium inputs
- Generalized Myers fallback for large inputs
- Zero runtime dependencies
- Works in Node.js and browsers

---

## Install

```sh
pnpm add lightning-levenshtein
```

---

## Quick start

```js
import { distance, distanceMax, closest } from "lightning-levenshtein";

distance("kitten", "sitting");                 // 3
distanceMax("kitten", "sitting", 2) > 2;       // true (over threshold)
closest("kitten", ["kitchen", "sitting"]);     // "kitchen"
```

---

## API

The package exposes three logical entrypoints, each with an ESM-source path for bundlers and a pre-built minified path for unbundled `<script type="module">` use:

```jsonc
{
  "exports": {
    ".":             { "import": "./src/index.js",       "default": "./dist/lightning-levenshtein.min.js" },
    "./min":         {                                    "default": "./dist/lightning-levenshtein.min.js" },
    "./v2":          { "import": "./src/v2/index.js",    "default": "./dist/lightning-levenshtein-v2.min.js" },
    "./v2/min":      {                                    "default": "./dist/lightning-levenshtein-v2.min.js" },
    "./unicode":     { "import": "./src/unicode.js",     "default": "./dist/lightning-levenshtein-unicode.min.js" },
    "./unicode/min": {                                    "default": "./dist/lightning-levenshtein-unicode.min.js" }
  }
}
```

The `.`, `./v2`, and `./unicode` entrypoints route bundlers at ESM source so unused code can be tree-shaken. Explicit `/min` subpaths expose the pre-built Closure bundles for consumers that want them directly.

### Default API

```js
import { distance, distanceMax, closest } from "lightning-levenshtein";
```

The stable core API. Bundlers receive ESM source; unbundled consumers can use `lightning-levenshtein/min` to point at the pre-built bundle directly.

### Max-throughput API

The `/v2` subpath exposes the larger max-throughput runtime:

```js
import { levenshteinLightning } from "lightning-levenshtein/v2";
```

Bundlers receive `src/v2/index.js`; `lightning-levenshtein/v2/min` exposes the pre-built bundle. The v2 runtime uses more aggressive length-based dispatch, tiny-string fast paths, precompiled 32-bit kernels, fixed-width Myers variants, and a generalized large-input fallback. Choose it when throughput matters more than the extra JavaScript payload.

### Unicode API

Full-width UTF-16 code-unit distance:

```js
import { distanceUnicode } from "lightning-levenshtein/unicode";
```

Use this path when your strings can contain code units above `255`, such as many BMP characters. It is intentionally separate from the default entrypoint so the default `distance` hot path does not pay for wider PEQ tables or per-call character-set routing. Use `lightning-levenshtein/unicode/min` for the pre-built bundle.

---

## Notes

### Which one should I pick?

Use the default package entrypoint if you want the stable general-purpose API with the smallest production build:

```js
import { distance, distanceMax, closest } from "lightning-levenshtein";
```

Use the `v2` subpath if you specifically want the specialized `levenshteinLightning` runtime and are comfortable with the larger payload:

```js
import { levenshteinLightning } from "lightning-levenshtein/v2";
```

Use the `unicode` subpath if you need UTF-16 code-unit correctness beyond the default low-memory PEQ table:

```js
import { distanceUnicode } from "lightning-levenshtein/unicode";
```

### Character table strategy

The default API is tuned for the hottest low-memory path and assumes ASCII/Latin-1-style input for its PEQ tables.

The `unicode` subpath exposes `distanceUnicode`, which is backed by full UTF-16 code-unit PEQ tables. That path is intentionally separate so callers can opt into wider character support without adding per-call detection to the default `distance` hot path.

The design direction is:

- keep `distance` fast and pre-routed for common ASCII/Latin-1 workloads
- expose Unicode-correct behavior through the deliberate `/unicode` subpath
- share kernel implementations by binding the PEQ table before entering the hot function
- avoid naive automatic routing that scans both strings on every call

### Dispatch strategy

The runtime selects the cheapest correct kernel for the current input size.

- **1–32 chars:** precompiled bit-parallel kernels
- **33–64 chars:** fixed-width Myers specialization
- **65–96 chars:** fixed-width Myers specialization
- **97–128 chars:** fixed-width Myers specialization
- **129–224 chars:** generalized macro-block Myers dispatch
- **225–256 chars:** fixed-width Myers specialization
- **257–512 chars:** generalized macro-block Myers dispatch
- **513+ chars:** large-input generalized Myers dispatch

This keeps tiny inputs fast without sacrificing larger-input performance.

### Benchmark

The benchmark harness generates the same string pairs for every library at each tested length and seed. Benchmarks were run in Node.js `v24.11.0`.

**Methodology:**

- 500 random equal-length string pairs per test size
- 3 seeds: `1337`, `7331`, `20250321`
- 500 ms measurement window per seed
- 3 warm-up rounds before timing
- alphabet: `A-Z`, `a-z`, `0-9`
- reported table values: **mean ops/ms across 3 seeds**

<!-- benchmark-table:start -->
**Mean ops/ms:**

| Test Target | N=1 | N=2 | N=4 | N=8 | N=16 | N=32 | N=64 | N=128 | N=256 | N=512 | N=1024 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lightning-levenshtein-v2 | 177370 | 88988 | 50529 | 32045 | 11954 | 6480 | 1805 | 577.3 | 156.1 | 39.39 | 10.31 |
| lightning-levenshtein-v1 | 95215 | 61582 | 40223 | 25487 | 8519 | 4889 | 1224 | 480.7 | 134.0 | 35.08 | 9.122 |
| fastest-levenshtein | 96497 | 74506 | 43428 | 23097 | 8104 | 4218 | 1060 | 301.4 | 80.81 | 19.35 | 4.977 |
| js-levenshtein | 99165 | 87103 | 22492 | 10966 | 3209 | 918.2 | 240.6 | 61.62 | 16.01 | 4.028 | 1.009 |
| leven | 72613 | 41947 | 21441 | 8117 | 1788 | 418.3 | 114.5 | 29.98 | 7.634 | 1.930 | 0.482 |
| levenshtein-edit-distance | 114695 | 54474 | 24222 | 8345 | 1753 | 394.0 | 106.2 | 27.47 | 7.004 | 1.761 | 0.439 |

<!-- benchmark-table:end -->

**Relative throughput vs `fastest-levenshtein`.** This chart normalizes `fastest-levenshtein` to **100% at each string length** and shows every other library relative to that baseline. Use it for an apples-to-apples comparison against the package most people already know. Values above 100% mean faster than `fastest-levenshtein`; values below 100% mean slower.

![Relative performance vs fastest-levenshtein](./bench/packages/relative-to-fastest-levenshtein.svg)

**Throughput across input sizes.** Mean ops/sec shown on a log-scaled Y axis across the full tested range.

![Levenshtein throughput by string length](./bench/packages/mean-ops-loglog-chart.svg)

**Relative throughput, `lightning-levenshtein` only.** Same baseline as above, narrowed to just `lightning-levenshtein` for a clearer read.

![Relative performance vs second-fastest competitor](./bench/packages/relative-performance.svg)

**Rank by input length.** Where each library ranks at each tested string length. Useful because raw throughput can be noisy to read at a glance, while rank makes the ordering obvious. If a library is consistently ranked first across the range, you can see that immediately without squinting at the absolute numbers.

![Rank by string length](./bench/packages/mean-rank-log-chart.svg)

### Results

<!-- benchmark-highlights:start -->
- `lightning-levenshtein-v2` is the fastest implementation in this checked-in Node benchmark at every tested length.
- Winning lengths: `N=1`, `N=2`, `N=4`, `N=8`, `N=16`, `N=32`, `N=64`, `N=128`, `N=256`, `N=512`, `N=1024`.
- At `N=1024`, mean throughput is **10.31 ops/ms** versus **4.977 ops/ms** for `fastest-levenshtein`.
- At `N=32`, mean throughput is **6480 ops/ms** versus **4218 ops/ms** for `fastest-levenshtein`.
- At `N=8`, mean throughput is **32045 ops/ms** versus **23097 ops/ms** for `fastest-levenshtein`.
<!-- benchmark-highlights:end -->

### Reproducing the benchmark

```sh
pnpm run bench:packages
pnpm run bench:packages:table
pnpm run bench:packages:chart
```

Generated files are written to `bench/packages/`.

### Project layout

```text
src/v2/
  index.js
  myers32-unrolledA.js
  myers_64.js
  myers_96.js
  myers_128.js
  myers_256.js
  myers_x64.js
  myers_x128.js

bench/bolt/
  experimental and historical kernel variants

bench/packages/
  run-bench.js
  render-readme-table.js
  render-readme-line-chart.js
  render-readme-rank-chart.js
  render-relative-bar-chart.js
  render-readme-relative-fastest-chart.js
  results.json
```

---

## License

Licensed under AGPL-3.0 with WATT3D Additional Terms. See [LICENSE](./LICENSE) and [ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md). Commercial AI/model-training use requires compliance with those terms or a separate WATT3D license. © WATT3D.

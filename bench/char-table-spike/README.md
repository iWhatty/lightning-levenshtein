# Char Table Spike

This bench maps the tradeoff behind the PEQ table size:

- `Uint32Array(256)` for low memory and fast ASCII/Latin-1-style paths
- `Uint32Array(65536)` for UTF-16 code-unit correctness
- `auto`, which uses the 256 table only when both strings stay under code unit `256`

The production runtime currently optimizes around small PEQ tables. This spike keeps the experiment isolated in `bench/` so the package API can choose deliberately later.

## Design Decision

Keep the default hot path fast and pre-routed. Do not add naive per-call character scanning to `distance`.

Unicode correctness should live behind an explicit route, currently prototyped in source as `distanceUnicode`. That lets callers choose the wider table path before entering the algorithm instead of asking the core hot path to decide on every call.

The shared-kernel architecture is:

- create the kernel from a PEQ table once
- default path binds `Uint32Array(256)`
- Unicode path binds `Uint32Array(65536)`
- the returned hot function has no mode branch inside the inner loop

## Questions

- How much slower is a 65536-wide PEQ table on ASCII workloads?
- Can `auto` preserve ASCII speed while fixing non-ASCII correctness?
- Which public shape should be promoted later: option flag, separate export, or subpath?

## Run

```bash
pnpm run bench:char-table
```

## Promotion Criteria

Promote only after testing the same mode idea across the production kernels, not just this 32-bit spike.

Unicode support is promoted as:

- a dedicated `/unicode` subpath

This keeps the default entrypoint small and avoids changing the behavior/performance profile of `distance`.

## Initial Observation

First 32-bit spike run:

- ASCII and Latin-1 had zero mismatches for both `256` and `65536`.
- Wider BMP input produced mismatches with `256`, while `65536` and `auto` stayed correct.
- `65536` was not consistently slower in this isolated short-string kernel and was sometimes faster.
- `auto` was correct, but the naive per-call scan for wide code units was visibly slower on ASCII workloads.

This points toward a separate Unicode path/export being cleaner than a per-call `auto` scan in the hottest default path. If `auto` is promoted, it should avoid repeated full-string scans when possible.

Avoid this as the primary package shape unless benchmarks prove it does not hurt:

```js
distance(a, b, { charMode: "auto" });
distance(a, b, { charMode: "ascii" });
distance(a, b, { charMode: "unicode" });
```

Preferred hot-path-friendly shape:

```js
import { distanceUnicode } from "lightning-levenshtein/unicode";
```

The source-level implementation lives at `src/distanceUnicode.js`, and the dist build is `dist/lightning-levenshtein-unicode.min.js`.

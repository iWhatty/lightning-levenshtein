# packages benchmark notes

## Goal
Benchmark the production lightning-levenshtein builds against other npm Levenshtein libraries.

## Rules
- Equal-length random string pairs
- Same dataset for all libraries per seed/length
- 500 pairs per dataset
- Arithmetic mean across 3 seeds
- README table reported as ops/ms; raw results retain ops/ms and ops/sec
- Microbenchmark results vary by runtime and machine; use the recorded environment and reproduce on the target platform before making deployment decisions

## Current workflow

- `results.json` is the historical dataset currently promoted into the README.
- New measurements are preserved as named raw repetitions under [`qualification/`](./qualification/README.md); they no longer overwrite `results.json`.
- Every dataset is checked against a simple reference before timing.
- Target order is deterministic and rotated by complete-suite repetition.
- Timed distance results are accumulated into a checksum rather than discarded.
- Explicit aggregates provide stability statistics and paired ratios before any future README promotion.

## Included packages
- lightning-levenshtein-v2 (max-throughput production build)
- lightning-levenshtein-v1 (default production build)
- fastest-levenshtein
- js-levenshtein
- leven
- levenshtein-edit-distance

## Excluded
Internal kernels and bench-only variants. `fast-levenshtein` is also excluded because it delegates to `fastest-levenshtein`; benchmarking both would duplicate the same implementation.

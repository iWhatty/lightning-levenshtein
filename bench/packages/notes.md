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

## Included packages
- lightning-levenshtein-v2 (max-throughput production build)
- lightning-levenshtein-v1 (default production build)
- fastest-levenshtein
- js-levenshtein
- leven
- levenshtein-edit-distance

## Excluded
Internal kernels and bench-only variants. `fast-levenshtein` is also excluded because it delegates to `fastest-levenshtein`; benchmarking both would duplicate the same implementation.

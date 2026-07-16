## Benchmark

I generated 500 pairs of strings with length N. I measured the throughput each library achieved across the same dataset. Higher is better.

Reported values are mean ops/ms across 3 seeds.

| Test Target | N=1 | N=2 | N=4 | N=8 | N=16 | N=32 | N=64 | N=128 | N=256 | N=512 | N=1024 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lightning-levenshtein-v2 | 177370 | 88988 | 50529 | 32045 | 11954 | 6480 | 1805 | 577.3 | 156.1 | 39.39 | 10.31 |
| lightning-levenshtein-v1 | 95215 | 61582 | 40223 | 25487 | 8519 | 4889 | 1224 | 480.7 | 134.0 | 35.08 | 9.122 |
| fastest-levenshtein | 96497 | 74506 | 43428 | 23097 | 8104 | 4218 | 1060 | 301.4 | 80.81 | 19.35 | 4.977 |
| js-levenshtein | 99165 | 87103 | 22492 | 10966 | 3209 | 918.2 | 240.6 | 61.62 | 16.01 | 4.028 | 1.009 |
| leven | 72613 | 41947 | 21441 | 8117 | 1788 | 418.3 | 114.5 | 29.98 | 7.634 | 1.930 | 0.482 |
| levenshtein-edit-distance | 114695 | 54474 | 24222 | 8345 | 1753 | 394.0 | 106.2 | 27.47 | 7.004 | 1.761 | 0.439 |

## Relative Performance

This chart shows how many times faster lightning-levenshtein-v2 is than the second-fastest package at each tested length.

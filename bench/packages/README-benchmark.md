## Benchmark

I generated 500 pairs of strings with length N. I measured the throughput each library achieved across the same dataset. Higher is better.

Reported values are mean ops/ms across 3 seeds.

Node v24.11.0 on win32 x64, 13th Gen Intel(R) Core(TM) i5-13600K.

| Test Target | N=1 | N=2 | N=4 | N=8 | N=16 | N=32 | N=64 | N=128 | N=256 | N=512 | N=1024 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lightning-levenshtein-v2 | 176959 | 87310 | 45325 | 29719 | 11565 | 6559 | 1582 | 557.3 | 136.1 | 34.14 | 10.22 |
| lightning-levenshtein-v1 | 89792 | 59605 | 40893 | 25256 | 8702 | 5080 | 1211 | 419.8 | 123.0 | 33.25 | 8.580 |
| fastest-levenshtein | 95025 | 73865 | 43340 | 22888 | 8073 | 4404 | 1024 | 288.2 | 77.55 | 19.27 | 4.968 |
| js-levenshtein | 100407 | 86948 | 22572 | 10990 | 3226 | 915.9 | 238.8 | 60.73 | 15.77 | 4.014 | 1.004 |
| leven | 73872 | 43095 | 21606 | 8014 | 1778 | 415.8 | 113.5 | 29.13 | 7.573 | 1.908 | 0.480 |
| levenshtein-edit-distance | 116046 | 56325 | 24109 | 8368 | 1776 | 394.7 | 104.9 | 26.94 | 6.886 | 1.750 | 0.429 |

## Relative Performance

This chart shows how many times faster lightning-levenshtein-v2 is than the second-fastest package at each tested length.

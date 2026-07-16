# Package Benchmark Evidence Index

## Current README promotion

- Promotion: [`legacy-windows-intel-node24-2026-07-16`](./promotion.json)
- Status: legacy compatibility evidence; it predates the raw-run qualification schema
- Workload: random equal-length ASCII package comparison
- Runtime: Node v24.11.0 on Windows x64
- CPU: 13th Gen Intel Core i5-13600K
- Source data: [`bench/packages/results.json`](../results.json)
- Source revision: not recorded by the legacy result format
- Rendered table: [`bench/packages/README-benchmark.md`](../README-benchmark.md)
- Charts: [relative baseline](../relative-to-fastest-levenshtein.svg), [throughput](../mean-ops-loglog-chart.svg), [lightning ratio](../relative-performance.svg), [rank](../mean-rank-log-chart.svg)

This entry documents the evidence currently displayed; it does not upgrade the legacy run into a qualification set.

## Qualified-set requirements

Every future entry must link:

- the promotion ID and aggregate file;
- every raw repetition;
- the clean source commit shared by those repetitions;
- package and competitor versions;
- Node/V8, OS, architecture, CPU, and logical-core metadata;
- workload configuration and stability statistics;
- the table and charts rendered from that promotion.

Intel, AMD, Apple Silicon, and browser-engine results receive separate entries and aggregates. Absolute throughput from different environments is never pooled.

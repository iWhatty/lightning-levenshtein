# Paired A/B Benchmark

Answers "is variant B faster or slower than variant A, and by how much?" on a host that is not quiet. It is a decision tool for internal changes. It does not produce README numbers; those come from the [package benchmark qualification workflow](../packages/qualification/README.md).

## Why a separate harness

Absolute throughput on a busy machine moves by several percent from one minute to the next, which is larger than most of the differences worth knowing about. A ratio of two variants measured side by side is far more stable than either number alone, because whatever slows the machine slows both. This harness measures only that ratio and then treats the result as a sample, not a fact.

## Design

1. **Same work for both variants.** Each cell (one comparison at one string length) uses 256 seeded string pairs, half unrelated and half near-duplicates. A block is a fixed number of passes over them, so only elapsed time differs.
2. **Interleaving.** Blocks run in `ABBA` then `BAAB` order. Within a round each variant runs once early and once late, so drift, frequency changes and interruptions land on both about equally. Each round yields one value: `ln(time B / time A)`.
3. **Robust within a process.** A process reports the median of its rounds for each cell, so a single preempted block cannot move it.
4. **Independent processes.** The whole suite is repeated in fresh Node processes. JIT decisions and memory layout differ between processes and can favor one variant by chance, so processes, not rounds, are the independent samples.
5. **Inference.** Across processes, each cell gets a mean, median, standard deviation, a one-sample t-test of the log ratios against zero, and a 95% confidence interval. Log ratios are used because time ratios are multiplicative and roughly symmetric on a log scale.
6. **Many cells, one error budget.** With dozens of cells, a few would cross p < 0.05 by chance. A Holm correction across all non-control cells keeps the chance of any false "faster" or "slower" verdict at 5% for the whole table.
7. **Noise floor.** `control` cells compare the default `distance` with a second copy of the same module. The true difference is zero, so whatever they report is what this method cannot see below.

Each variant gets its own runner function compiled from text, so the call inside the timing loop only ever sees one target.

## Comparisons

| id | A | B |
| --- | --- | --- |
| `control distance` | `src` default `distance` | the same module, loaded again |
| `pool v2` | `src/v2` | [shared PEQ pool spike](../shared-peq-spike/README.md) |
| `baseline distance`, `baseline distanceMax`, `baseline closest`, `baseline v2` | a checkout of an earlier revision, given with `--baseline` | `src` |

All workloads use the alphanumeric alphabet, so a baseline comparison measures what a change costs existing ASCII callers.

The [default wide-table spike](../default-wide-spike/README.md) was measured with this harness against `src` before it was promoted; that comparison was removed once `src` and the spike became the same code.

## Run

From the repository root, with output outside the checkout:

```bash
node bench/paired-ab/run.js --out-dir=<external-directory> --baseline=<checkout-of-earlier-revision>
```

Options: `--processes=12`, `--rounds=10`, `--block-ms=15`, `--only=<substring of a comparison id>`. Without `--baseline` the baseline comparisons are skipped.

## Reading the table

- **mean%, median%**: time per call of B relative to A. Negative means B is faster.
- **95% CI**: range for the true difference. If it excludes zero, the cell is individually significant.
- **sd%**: spread of the per-process estimates.
- **verdict**: `B faster` or `B slower` only when the cell survives the Holm correction; otherwise `no difference shown`.

"No difference shown" is not "no difference". Read the confidence interval: an interval of [-0.5, +0.6] rules out anything that matters, while [-6, +9] means the run could not tell. More processes narrow it.

## Limits

- One machine, one Node version, one alphabet. A result here does not transfer to other CPUs or engines without rerunning.
- A/B within one process means both variants share a heap and a JIT. That is deliberate, but it is not the same as shipping one of them alone.
- Sustained load that happens to line up with one variant's blocks would bias a process; alternating round order and using many processes makes that unlikely, not impossible.

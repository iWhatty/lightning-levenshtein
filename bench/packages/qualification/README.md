# Package Benchmark Qualification

Qualification results are deliberately separate from `bench/packages/results.json`, which remains the currently promoted README dataset.

## Correctness-only smoke check

This command builds every deterministic dataset and checks every target against the simple dynamic-programming reference. It does not enter timed loops or write results:

```bash
pnpm run bench:packages:verify
```

Use CLI overrides for a smaller diagnostic check:

```bash
node bench/packages/run-bench.js --verify-only --lengths=31,32,33 --seeds=1337 --pairs=20
```

## Qualification repetitions

Wait for a quiet host, commit the exact code under test, then run complete repetitions in separate processes:

```bash
node bench/packages/run-bench.js --repetition=0
node bench/packages/run-bench.js --repetition=1
node bench/packages/run-bench.js --repetition=2
```

Each invocation writes a uniquely named schema-v2 document under `qualification/raw/`. The document includes revision state, dependency and runtime versions, command configuration, deterministic target order, verification checksums, consumed timed checksums, and individual seed samples.

Do not rename a run to conceal its origin. Add a short companion note when background load, power policy, affinity, or other conditions materially differ from the host's normal qualification state.

## Aggregation

Aggregate an explicit set of raw files:

```bash
node bench/packages/aggregate-runs.js --set=windows-intel-node24-001 bench/packages/qualification/raw/<run-0>.json bench/packages/qualification/raw/<run-1>.json bench/packages/qualification/raw/<run-2>.json
```

The aggregate reports mean, median, minimum, maximum, population standard deviation, coefficient of variation, and paired ratio to `fastest-levenshtein`. Inputs must have matching workload configurations; absolute results from different machines must not be combined.

README promotion is intentionally not automatic yet. Until the promotion slice lands, `results.json` and its charts remain historical published evidence rather than an implicitly latest qualification run.

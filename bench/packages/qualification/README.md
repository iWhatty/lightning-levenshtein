# Package Benchmark Qualification

Qualification results are deliberately separate from `bench/packages/results.json`. The README renderers consume only the explicit [`promotion.json`](./promotion.json) manifest. See the durable [`RESULTS.md`](./RESULTS.md) evidence index.

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

Each invocation writes a uniquely named schema-v2 document under `qualification/raw/`. The document includes revision state, dependency and runtime versions, command configuration, deterministic target order, separate dataset and expected-distance checksums, consumed timed checksums, and individual seed samples.

Do not rename a run to conceal its origin. Add a short companion note when background load, power policy, affinity, or other conditions materially differ from the host's normal qualification state.

## Aggregation

Aggregate an explicit set of raw files:

```bash
node bench/packages/aggregate-runs.js --set=windows-intel-node24-001 bench/packages/qualification/raw/<run-0>.json bench/packages/qualification/raw/<run-1>.json bench/packages/qualification/raw/<run-2>.json
```

The aggregate reports mean, median, minimum, maximum, population standard deviation, coefficient of variation, and paired ratio to `fastest-levenshtein`. Inputs must have matching workload configurations; absolute results from different machines must not be combined. It also records the raw input paths so promotion validation can prove the evidence chain remains present.

## Promotion

Validate the currently selected evidence without changing generated files:

```bash
pnpm run bench:packages:promotion:check
```

Promote one named, checked-in aggregate:

```bash
pnpm run bench:packages:promote -- --id=windows-intel-node24-001 --aggregate=bench/packages/qualification/aggregates/windows-intel-node24-001.json
pnpm run bench:packages:render
```

Promotion rejects fewer than three runs, dirty or mixed revisions, mixed runtime/machine metadata, mixed package or competitor versions, missing raw files, workload or baseline mismatches, verification-only inputs, duplicate run IDs, and invalid metrics. The README surface is intentionally scoped to the Node random-equal-length ASCII comparison of `lightning-levenshtein-v2` against `fastest-levenshtein`.

The current manifest points explicitly at legacy `results.json` so existing public numbers remain unchanged. It is labeled legacy because the old format did not record raw repetition paths or a Git revision. The next measured qualification should replace it rather than rewriting its provenance.

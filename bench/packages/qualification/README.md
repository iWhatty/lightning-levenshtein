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

Wait for a quiet host, commit the exact code under test, then run complete repetitions in separate processes. From repository root, this example stores evidence in durable sibling directory `../lightning-evidence/packages` outside checkout (not an automatically cleaned temporary directory):

```bash
node bench/packages/run-bench.js --repetition=0 --out-dir=../lightning-evidence/packages
node bench/packages/run-bench.js --repetition=1 --out-dir=../lightning-evidence/packages
node bench/packages/run-bench.js --repetition=2 --out-dir=../lightning-evidence/packages
```

`pnpm run bench:packages` also requires an explicit external `--out-dir` for measured collection. The obsolete `bench:packages:all` shortcut was removed; it could not supply that directory or perform evidence review and promotion. Use the separate import, aggregate, promotion, and render steps below after reviewing raw evidence.

Each invocation writes a uniquely named schema-v2 document into that directory, using atomic exclusive publication. The output filesystem must support hard links (for example, NTFS); unsupported filesystems fail without leaving partial evidence. The document includes revision state, dependency and runtime versions, command configuration, deterministic target order, separate dataset and expected-distance checksums, consumed timed checksums, and individual seed samples. External collection leaves the checkout clean between repetitions. A real source, dependency, or configuration edit still changes Git status; such runs cannot qualify together.

Do not rename a run to conceal its origin. Add a short companion note when background load, power policy, affinity, or other conditions materially differ from the host's normal qualification state.

## Import and aggregation

Review the three external raw files, then import them explicitly. Replace filenames below with the run IDs printed by collection. Import validates the complete set before copying original bytes. Existing run IDs cannot be overwritten:

```bash
node bench/import-runs.js --kind=packages <absolute-external-run-0.json> <absolute-external-run-1.json> <absolute-external-run-2.json>
```

Imported files live under `qualification/raw/<run-id>.json`. Keep the external originals until the checked-in files and aggregate are reviewed.

Aggregate an explicit set of raw files:

```bash
node bench/packages/aggregate-runs.js --set=windows-intel-node24-001 bench/packages/qualification/raw/<run-0>.json bench/packages/qualification/raw/<run-1>.json bench/packages/qualification/raw/<run-2>.json
```

The aggregate reports mean, median, minimum, maximum, population standard deviation, coefficient of variation, and paired ratio to `fastest-levenshtein`. Inputs must have unique run identifiers and matching measurement settings, dataset checksums, expected-distance checksums, seed identities, target sets, revisions, runtimes, and dependency versions; absolute results from different machines must not be combined. It also records the raw input paths so promotion validation can prove the evidence chain remains present.

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

Promotion rejects fewer than three runs, repeated repetition IDs or target-order rotations, recorded orders that disagree with their repetition schedules, dirty or mixed revisions, mixed runtime/machine metadata, mixed package or competitor versions, missing/aliased/outside raw files, workload or baseline mismatches, verification-only inputs, duplicate run IDs, invalid metrics, or stored statistics/metadata differing from raw recomputation. The README surface is intentionally scoped to the Node random-equal-length ASCII comparison of `lightning-levenshtein-v2` against `fastest-levenshtein`.

The current manifest points explicitly at legacy `results.json` so existing public numbers remain unchanged. It is labeled legacy because the old format did not record raw repetition paths or a Git revision. The next measured qualification should replace it rather than rewriting its provenance.

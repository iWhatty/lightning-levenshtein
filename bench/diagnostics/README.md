# Workload and Dispatch Diagnostics

This suite is separate from the compact public package comparison. It answers which production entrypoint or text profile performs best for a specific workload shape and whether behavior changes around v2 dispatch boundaries.

The default command is correctness-only and writes no performance data:

```bash
pnpm run bench:diagnostics:verify
```

It covers the seven documented workload families at `1/2/3`, `31/32/33`, `63/64/65`, `95/96/97`, `127/128/129`, `223/224/225`, `255/256/257`, and `511/512/513`.

Use a narrow smoke check while developing generators:

```bash
node bench/diagnostics/run-workload-matrix.js --families=random-ascii,latin1,bmp-code-units --lengths=31,32,33 --seeds=1337 --pairs=8
```

Timing requires the explicit `--measure` flag and should only run on a settled host:

```bash
node bench/diagnostics/run-workload-matrix.js --measure --repetition=0 --out-dir=../lightning-evidence/diagnostics
node bench/diagnostics/run-workload-matrix.js --measure --repetition=1 --out-dir=../lightning-evidence/diagnostics
```

Every measured invocation requires `--out-dir`; use the same durable directory outside the checkout for all repetitions. Verification-only runs need no output directory and write nothing. Measured files use atomic exclusive publication, which requires hard-link support in the output filesystem; unsupported filesystems fail without partial evidence. They retain separate dataset and expected-distance checksums. Profile factories are constructed once at module initialization, outside verification, warm-up, and timing. Checked and assume-valid targets are named independently. Targets that cannot represent a workload domain are omitted rather than allowed to return misleading distances.

After review, import external files before aggregation. Replace filenames below with the run IDs printed by collection:

```bash
node bench/import-runs.js --kind=diagnostics <absolute-external-run-0.json> <absolute-external-run-1.json> <absolute-external-run-2.json>
```

Import validates all inputs before copying original bytes into `results/raw/<run-id>.json`; collisions fail. External collection prevents earlier repetitions from dirtying later ones while Git still detects real changes.

Aggregate compatible repetitions into paired stability statistics and ratios to an explicit baseline:

```bash
pnpm run bench:diagnostics:aggregate -- --set=intel-node24-r1-r3 --baseline=v2 bench/diagnostics/results/raw/run-1.json bench/diagnostics/results/raw/run-2.json bench/diagnostics/results/raw/run-3.json
```

Aggregates are written under `results/aggregates/`. Input runs must share configuration, workload checksums, target sets, source revision, and runtime metadata. Run identifiers must be unique. The default baseline is `v2`, which exists for every workload domain.

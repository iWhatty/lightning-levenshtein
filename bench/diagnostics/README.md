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
node bench/diagnostics/run-workload-matrix.js --measure --repetition=0
```

Measured runs are preserved under `results/raw/` with separate dataset and expected-distance checksums. Profile factories are constructed once at module initialization, outside verification, warm-up, and timing. Checked and assume-valid targets are named independently. Targets that cannot represent a workload domain are omitted rather than allowed to return misleading distances.

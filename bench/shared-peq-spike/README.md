# Shared PEQ Pool Spike

This bench tests whether the v2 kernels can share one set of full code-unit PEQ lanes instead of each owning private tables.

Production v2 allocates 24 lanes of 65,536 entries across seven kernel modules: 6 MiB per module realm or worker. Kernels are synchronous and clear every entry they set, so no two kernels hold table contents at once. The widest kernel needs 8 lanes, so a shared pool of 8 lanes (2 MiB) can serve all of them.

## Files

- `peqPool.js`: the eight shared lanes.
- `derive-kernels.js`: copies the production kernels from `src/v2/` into `kernels/`, replacing only the private table declarations with pool imports. Kernel bodies stay identical. `--check` fails if `kernels/` has drifted from production.
- `kernels/`: derived output. Do not edit by hand.
- `verify.js`: correctness only. No timing and no result files.

## Commands

```bash
node bench/shared-peq-spike/derive-kernels.js
node bench/shared-peq-spike/derive-kernels.js --check
node bench/shared-peq-spike/verify.js
```

## What verification covers

- Pooled v2 against the dynamic-programming reference and production v2, at every production dispatch boundary and its neighbours, in both argument orders.
- DNA, printable ASCII, and full code-unit alphabets including `0`, surrogates, and `0xFFFF`.
- Shuffled call order, so consecutive calls land in different tiers and reuse the same lanes.
- The pool invariant: every lane is zero again after every call.

## Not yet established

- Throughput. The pooled kernels have not been timed against production. A paired comparison on a quiet host is required before promotion, with mixed-length workloads included.
- Process-level memory. The 6 MiB to 2 MiB figure is typed-array arithmetic; the worker-memory harness should confirm it.
- Failure isolation. A call that throws midway leaves lanes dirty. With private tables that corrupts one tier; with a pool it corrupts all of them. Entry-point input validation should land before or with any promotion.

Promote only if throughput is neutral or better across repeated runs and correctness stays green.

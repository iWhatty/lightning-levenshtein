# Stable Long-Kernel Profile Spike

This spike measures the first delivery gate in the text-profile integration plan: extracting the stable two-lane long-string kernel into a factory that binds caller-owned PEQ tables once.

It compares the historical full-width implementation with:

- the unchanged stable `myers_x64` export, now pre-bound through the factory;
- a 128-entry ASCII profile;
- a 256-entry Latin-1 profile;
- a 65,536-entry JavaScript code-unit profile.

The benchmark constructs every factory outside the timed loop and performs no runtime profile dispatch or validation. Each result is checked against the historical kernel before measurement. Workloads only use code units valid for the profile being measured.

## Static PEQ Memory

The long kernel owns two `Uint32Array` lanes per instance:

| Profile | Entries per lane | Two-lane PEQ memory |
| --- | ---: | ---: |
| ASCII | 128 | 1 KiB |
| Latin-1 | 256 | 2 KiB |
| Code unit | 65,536 | 512 KiB |

Scratch buffers grow with input length and are separate from these static PEQ totals. Process-level and multi-worker memory still require the worker harness described in the integration plan.

The whole-dispatch prototype adds one shared short/blockwise lane, bringing its static PEQ payload to 1.5 KiB for ASCII, 3 KiB for Latin-1, or 768 KiB for full code-unit coverage.

## Run

```bash
pnpm run bench:profiles
pnpm run bench:profiles:dispatch
pnpm run bench:profiles:workers
```

The second command measures the bench-only dispatcher in `create-profile-distance.js` across the short, blockwise, and long tiers. It compares `throw` with `assume-valid`; factory construction remains outside the timed loop.

The worker command launches each profile/count combination in a fresh child process, starts workers sequentially for clean before/after allocation deltas, and then runs them concurrently. It covers 1, 2, 4, and 8 workers and reports:

- aggregate operations per second on 256-code-unit inputs;
- spawn-to-ready and factory construction time;
- process-wide RSS before and after work;
- worker-local heap, `external`, and `arrayBuffers` deltas;
- retained array-buffer payload after touching every tier through 1,024 code units.

The harness uses `--expose-gc` to reduce unrelated startup churn. RSS and `external` still include runtime allocation behavior and should be treated as noisy; the dedicated `arrayBuffers` delta most directly confirms PEQ payload.

Treat a single run as directional. Compare multiple runs and Node versions before setting a performance tolerance or promoting a public profile API.

## Initial Observation

On Node 24.11.0 for Windows, the first two-seed run found:

- all measured variants matched the historical implementation;
- at 256 characters, bound variants ranged from `0.980x` to `1.005x` of historical throughput;
- at 700 characters, bound variants ranged from `0.995x` to `1.044x`;
- the noisier 96-character cases ranged from `0.969x` to `1.038x`.

This is enough to continue the factory spike without identifying an obvious regression. It is not enough to claim that PEQ width improves throughput. Promotion still requires repeat runs on the supported Node versions and the worker-memory harness.

### Whole-dispatch observation

The first Node 24.11.0 Windows dispatcher run found:

- unchecked ASCII and Latin-1 profiles ranged from `0.978x` to `1.028x` of the existing default at 16, 48, 96, and 256 characters;
- the code-unit profile ranged from `0.985x` to `1.003x` of `/unicode` on wider BMP code units;
- `throw` validation cost was most visible on short inputs, ranging from `0.656x` to `0.970x` of the default controls across the measured ASCII and Latin-1 workloads.

The unchecked result supports keeping mode selection outside the hot kernels. The checked result supports exposing an explicit unchecked policy for pipelines that validate or normalize once upstream.

### Worker observation

The first Node 24.11.0 Windows worker run measured:

| Profile | 1-worker ops/s | 8-worker ops/s | 8-worker scaling | Factory arrays, 8 workers | Arrays after largest input |
| --- | ---: | ---: | ---: | ---: | ---: |
| ASCII | 149,693 | 1,028,261 | 6.87x | 12 KiB | 14 KiB |
| Latin-1 | 148,641 | 1,067,065 | 7.18x | 24 KiB | 26 KiB |
| Code unit | 163,956 | 1,069,710 | 6.52x | 6 MiB | about 6 MiB |

Eight-worker ready-state RSS was about 101 MiB for ASCII/Latin-1 and 111 MiB for code-unit profiles in this run. That gap is directionally consistent with the 6 MiB code-unit PEQ payload, but RSS is too allocator- and runtime-sensitive to infer table cost by subtraction from one run. Repeat on Node 18, Linux, and the deployment hardware before capacity planning.

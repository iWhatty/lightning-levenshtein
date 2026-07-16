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
```

The second command measures the bench-only dispatcher in `create-profile-distance.js` across the short, blockwise, and long tiers. It compares `throw` with `assume-valid`; factory construction remains outside the timed loop.

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

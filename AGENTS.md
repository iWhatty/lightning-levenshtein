# AGENTS.md

Guidance for future Codex/agent runs in this repository.

## Project Shape

- `src/` contains the stable public API used for the default package entrypoint.
- `src/v2/` contains the max-throughput runtime source that builds into `dist/lightning-levenshtein-v2.min.js`.
- `bench/bolt/` retains experimental and historical v2 kernel variants.
- `bench/` and `codegen/` are working areas for experiments before changes graduate into the package entrypoints.
- `dist/` is published and should be rebuilt with the package scripts after source changes.
- GitHub Actions is intentionally disabled because it consumes paid cloud compute. Never re-enable, dispatch, or watch cloud CI without explicit maintainer authorization. Use local machines for Windows, Linux/WSL, macOS, CPU-family, and Node-version coverage. See `docs/ci-policy.md`.

## Common Commands

- This workspace currently uses pnpm for dependency locking. Keep `pnpm-lock.yaml` and avoid reintroducing `package-lock.json` unless the maintainer asks.
- `pnpm test` runs the Jest suite. On Windows PowerShell environments where package-manager shims are blocked, use the `.cmd` shim.
- `pnpm run build:all` rebuilds all production bundles: default, `/v2`, `/unicode`, and `/profiles`.
- `pnpm run check:ci` runs the complete local release gate.
- `pnpm run test:source` syntax-checks repository JavaScript and verifies relative imports without executing benchmarks.
- `pnpm run codegen:myers32:a` refreshes the production v2 short-string table and its comparison artifact; `pnpm run codegen:check` verifies both outputs.
- `pnpm run bench:packages` runs the public package comparison benchmark.
- `pnpm run bench:packages:promotion:check` validates the selected README evidence; `bench:packages:promote` selects a qualified aggregate and `bench:packages:render` refreshes all generated outputs.
- `pnpm run bench:myers32` and `pnpm run bench:myersx` run kernel exploration benches.
- `pnpm run bench:profiles` compares table-bound stable long-kernel widths with the historical implementation.
- `pnpm run bench:profiles:dispatch` measures checked and unchecked profile prototypes across stable tiers.
- `pnpm run bench:profiles:workers` isolates 1/2/4/8-worker profile throughput and memory measurements.
- `pnpm run bench:diagnostics:verify` checks all workload families and v2 dispatch edges without timing; `pnpm run bench:diagnostics` enables measurement explicitly.

## Maintainer Notes

- Keep the default API small: `distance`, `distanceMax`, and `closest`.
- Keep benchmark claims reproducible from checked-in scripts and data generation settings.
- Prefer proving algorithm changes in `bench/` or `codegen/` before moving them into `src/` or `src/v2/`.
- Be careful with case-sensitive paths. Windows may pass imports that fail on Linux and npm consumers.
- The default short and blockwise tiers use a 256-entry PEQ, while its long fallback and all v2 tiers use wider tables. Future PEQ-width support should stay explicit and pre-routed, not a silent default change or per-call auto scan in the hot path.
- `docs/use-cases-and-text-profiles.md` records the intended configurable alphabet direction, current static PEQ memory costs, and the distinction between code-unit, byte, token, code-point, and grapheme distance.
- `docs/text-profile-integration-plan.md` scopes stable-core profiles first and defers v2 width variants until shared generation and worker-memory evidence exist.
- PEQ-width variants should share factory implementations where possible. Bind the table once at module setup, then export a hot function with no inner-loop mode checks.
- `src/distanceUnicode.js` backs the explicit `/unicode` subpath through `src/unicode.js`. Do not export Unicode code from `src/index.js`; that causes the default dist bundle to pull in wide tables.
- Do not overwrite unrelated lockfile changes. This repo is currently on pnpm in the maintainer's local system.
- Do not treat a push as authorization to run GitHub Actions. The retained workflow must stay `.disabled`; request a maintainer-run local platform check when additional coverage is needed.

## Polish Backlog

- Keep TypeScript declarations aligned with public package exports.
- Benchmark a batch-oriented Wasm/AssemblyScript prototype before considering a runtime rewrite. See `bench/assemblyscript-spike/README.md`.

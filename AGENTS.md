# AGENTS.md

Guidance for future Codex/agent runs in this repository.

## Project Shape

- `src/` contains the stable public API used for the default package entrypoint.
- `bench/bolt/` contains the v2 runtime source that builds into `dist/lightning-levenshtein-v2.min.js`.
- `bench/` and `codegen/` are working areas for experiments before changes graduate into the package entrypoints.
- `dist/` is published and should be rebuilt with the package scripts after source changes.

## Common Commands

- This workspace currently uses pnpm for dependency locking. Keep `pnpm-lock.yaml` and avoid reintroducing `package-lock.json` unless the maintainer asks.
- `pnpm test` runs the Jest suite. On Windows PowerShell environments where package-manager shims are blocked, use the `.cmd` shim.
- `pnpm run build:all` rebuilds both production bundles.
- `pnpm run bench:packages` runs the public package comparison benchmark.
- `pnpm run bench:myers32` and `pnpm run bench:myersx` run kernel exploration benches.

## Maintainer Notes

- Keep the default API small: `distance`, `distanceMax`, and `closest`.
- Keep benchmark claims reproducible from checked-in scripts and data generation settings.
- Prefer proving algorithm changes in `bench/` or `codegen/` before moving them into `src/` or `bench/bolt/`.
- Be careful with case-sensitive paths. Windows may pass imports that fail on Linux and npm consumers.
- Current production builds optimize around small PEQ tables and ASCII/Latin-1-style input. Unicode-width PEQ support should be treated as an explicit benchmarked mode, not a silent default change.
- Do not overwrite unrelated lockfile changes. This repo is currently on pnpm in the maintainer's local system.

## Polish Backlog

- Add CI on Linux to catch import-case drift.
- Add a deliberate char-table mode spike: low-memory `256`, Unicode `65536`, and possibly `auto`.
- Add TypeScript declarations once the public API settles.
- Benchmark a batch-oriented Wasm/AssemblyScript prototype before considering a runtime rewrite. See `bench/assemblyscript-spike/README.md`.

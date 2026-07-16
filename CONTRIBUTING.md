# Contributing

Issues and focused pull requests are welcome. Please discuss large API or algorithm changes before investing substantial work.

## Development

Use the pinned pnpm version and preserve `pnpm-lock.yaml`:

```bash
pnpm install --frozen-lockfile
pnpm run check:ci
```

GitHub Actions is intentionally disabled. Run verification locally and report the operating system, architecture, Node version, and command result when platform behavior matters. The supported-version matrix, pnpm switching commands, and evidence policy are documented in [`docs/node-version-testing.md`](./docs/node-version-testing.md).

## Project Constraints

- Keep the default API limited to `distance`, `distanceMax`, and `closest`.
- Prove performance ideas in `bench/` or `codegen/` before changing production kernels.
- Do not update public benchmark claims without the qualification and promotion workflow in [`bench/packages/qualification/README.md`](./bench/packages/qualification/README.md).
- Rebuild production bundles with `pnpm run build:all` after source changes.
- Keep declarations and package exports aligned.

By submitting a contribution, you agree that it may be distributed under the repository's [`LICENSE`](./LICENSE) and [`ADDITIONAL_TERMS.md`](./ADDITIONAL_TERMS.md).

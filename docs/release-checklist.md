# Release Checklist

Use this checklist before publishing `lightning-levenshtein`.

See [`ci-policy.md`](./ci-policy.md) for what CI is expected to catch and why tracked bundle byte-diff checks are intentionally not part of the release gate.

## Preflight

- Confirm the working tree only contains intended release changes:

```bash
git status --short
```

- Run the local CI-equivalent check:

```bash
pnpm run check:ci
```

- Or run the same checks step by step:

```bash
pnpm run build:all
```

```bash
pnpm test --runInBand --verbose
```

```bash
pnpm run test:package
```

```bash
pnpm run test:package:types
```

```bash
pnpm run test:package:tarball
```

```bash
pnpm run test:package:pack
```

## Entrypoint Positioning

- Default entrypoint: `lightning-levenshtein`
  - Routes ESM consumers to `src/index.js` for tree shaking.
  - Stable public API: `distance`, `distanceMax`, `closest`.
  - Best default for users who want fast distance checks without the larger specialized runtime.
  - `lightning-levenshtein/min` explicitly selects the pre-built Closure bundle.

- Max-throughput entrypoint: `lightning-levenshtein/v2`
  - Routes ESM consumers to `src/v2/index.js` for tree shaking.
  - Larger JavaScript payload.
  - Uses aggressive length-based dispatch and specialized kernels.
  - Best for users who prefer maximum speed over package size.
  - `lightning-levenshtein/v2/min` explicitly selects the pre-built Closure bundle.

- Unicode entrypoint: `lightning-levenshtein/unicode`
  - Routes ESM consumers to `src/unicode.js` for tree shaking.
  - Explicit UTF-16 code-unit path.
  - Keeps wider PEQ tables out of the default hot path.
  - `lightning-levenshtein/unicode/min` explicitly selects the pre-built Closure bundle.

- Profile entrypoint: `lightning-levenshtein/profiles`
  - Routes ESM consumers to `src/profiles.js`.
  - Exports `createDistance` with explicit ASCII, Latin-1, or code-unit profiles.
  - Defaults to rejecting out-of-profile input; unchecked use must be explicit.
  - Keeps profile tables out of the default bundle and owns state per returned function.
  - `lightning-levenshtein/profiles/min` explicitly selects the pre-built Closure bundle.

## Benchmark Evidence Review

- If performance claims or benchmark tables changed, identify the named qualification aggregate used for the update.
- Run `pnpm run bench:packages:promotion:check` and confirm the manifest is not marked `legacy` for new or refreshed claims.
- Confirm its raw repetitions, source revision, dependency versions, environment, workload, and stability statistics are checked in.
- Confirm `bench/packages/qualification/RESULTS.md` links the aggregate, raw inputs, rendered outputs, revision, and environment.
- Confirm results from different machines or JavaScript engines were reported separately rather than pooled.
- Benchmark refreshes are evidence reviews, not mandatory CI workloads; unchanged claims do not require a fresh run for every release.

## Publish

- Bump the version intentionally:

```bash
pnpm version patch
```

- Commit the version bump and rebuilt artifacts.
- Push only after the required local gates pass. GitHub Actions is intentionally disabled; arrange any Linux, macOS, WSL, CPU-family, or alternate-Node checks on maintainer-provided local machines.
- Publish:

```bash
npm publish
```

`npm publish` runs `pnpm run check:ci` through `prepublishOnly`.

## Post-Publish

- Verify the package page lists the expected version.
- Install the published version in a fresh fixture and import:
  - `lightning-levenshtein`
  - `lightning-levenshtein/min`
  - `lightning-levenshtein/v2`
  - `lightning-levenshtein/v2/min`
  - `lightning-levenshtein/unicode`
  - `lightning-levenshtein/unicode/min`
  - `lightning-levenshtein/profiles`
  - `lightning-levenshtein/profiles/min`
- Confirm the README renders expected benchmark charts on npm.

# Release Checklist

Use this checklist before publishing `lightning-levenshtein`.

## Preflight

- Confirm the working tree only contains intended release changes:

```bash
git status --short
```

- Rebuild all published bundles:

```bash
pnpm run build:all
```

- Run the Jest suite:

```bash
pnpm test --runInBand --verbose
```

- Check package self-referenced exports:

```bash
pnpm run test:package
```

- Pack, install, and import the tarball from a temporary fixture:

```bash
pnpm run test:package:tarball
```

- Inspect the publish file list:

```bash
npm pack --dry-run
```

## Entrypoint Positioning

- Default entrypoint: `lightning-levenshtein`
  - Compact payload.
  - Stable public API: `distance`, `distanceMax`, `closest`.
  - Best default for users who want fast distance checks without the larger specialized runtime.

- Max-throughput entrypoint: `lightning-levenshtein/v2`
  - Larger JavaScript payload.
  - Uses aggressive length-based dispatch and specialized kernels.
  - Best for users who prefer maximum speed over package size.

- Unicode entrypoint: `lightning-levenshtein/unicode`
  - Explicit UTF-16 code-unit path.
  - Keeps wider PEQ tables out of the default hot path.

## Publish

- Bump the version intentionally:

```bash
pnpm version patch
```

- Commit the version bump and rebuilt artifacts.
- Push and wait for GitHub Actions to pass.
- Publish:

```bash
npm publish
```

## Post-Publish

- Verify the package page lists the expected version.
- Install the published version in a fresh fixture and import:
  - `lightning-levenshtein`
  - `lightning-levenshtein/v2`
  - `lightning-levenshtein/unicode`
- Confirm the README renders expected benchmark charts on npm.

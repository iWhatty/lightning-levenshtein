# CI Policy

GitHub Actions should stay as a small release safety net for this package.

## What CI Should Catch

- Clean install failures from `pnpm-lock.yaml` drift.
- Linux path and import-case issues that Windows may not reveal.
- Broken relative imports or syntax in checked-in benchmark and codegen tools.
- Build failures for the default, `/v2`, and `/unicode` bundles.
- Jest regressions.
- Public package export drift.
- Declaration-file drift.
- Packed tarball install failures.
- Unexpected published file-list changes.

The current CI job intentionally mirrors `pnpm run check:ci`.

## What CI Should Not Be

CI should not become a benchmark lab or a byte-for-byte minifier auditor.

We tried checking that rebuilt tracked bundles were identical after `pnpm run build:all`. That caught a real difference between local Windows builds and GitHub Linux builds, but the difference came from Closure/minifier output formatting and ordering details rather than a proven behavior regression. Even after making Closure inputs sorted in JavaScript, the Linux build still produced non-identical minified output.

The Closure compiler and pnpm versions are pinned. CI deliberately covers both the documented minimum Node.js major and the current development major. Byte-identical generated artifacts remain too brittle because platform-specific compiler output formatting and line wrapping can still differ without changing behavior.

## Decision

Keep GitHub CI.

Keep CI focused on:

- fresh Linux install
- Node.js 18 compatibility and the current Node.js 24 development target
- package build
- runtime tests
- package export smoke tests
- declaration smoke tests
- tarball install smoke tests
- exact publish file-list smoke tests

Do not re-add a tracked bundle byte-diff guard unless the build pipeline is also made deterministic across OS and line-wrapping behavior.

Sorted Closure input enumeration is still useful and should remain in the build scripts. It reduces avoidable nondeterminism even though it does not make the final minified output byte-identical across every environment.

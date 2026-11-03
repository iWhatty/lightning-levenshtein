# CHANGELOG — `lightning-levenshtein`

What changed for people using the package, per release. Entries before 0.0.5 were reconstructed from git history.

## 0.0.7 — 2026-11-02

- Fix: `createDistance` rejects profile names inherited from `Object.prototype`, such as `"constructor"` and `"toString"`, with the usual unknown-profile `TypeError`.

## 0.0.6 — 2026-07-16

- Fix: the v2 kernels for 33–64 and 65–96 character strings could overstate the distance for mixed and repeated inputs, because an addition carry was dropped.
- New `/profiles` and `/profiles/min` entry points: `createDistance({ profile, outOfRange })` builds a distance function for ASCII, Latin-1 or full UTF-16 code-unit input, with checked or prevalidated input.

## 0.0.5 — 2026-05-26

- With a bundler, `./v2` resolves to the ES module source; `./v2/min` selects the prebuilt bundle.
- Requires Node 18 or later.

## 0.0.4 — 2026-05-20

- With a bundler, the root and `./unicode` resolve to the ES module source; `./min` and `./unicode/min` select the prebuilt bundles.
- Relicensed to AGPL-3.0 with WATT3D Additional Terms.

## 0.0.3 — 2026-05-13

- `./unicode` entry point for strings beyond Latin-1.
- Marked side-effect free for bundlers.

## 0.0.2 — 2026-03-23

- First releases on npm (0.0.1 and 0.0.2): bit-parallel Myers Levenshtein distance, with the `v2` length dispatcher.

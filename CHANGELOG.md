# CHANGELOG — `lightning-levenshtein`

What changed for people using the package, per release. Entries before 0.0.5 were reconstructed from git history.

## 0.1.0

- **Behavior change.** The default `distance`, `distanceMax` and `closest` now handle all UTF-16 code units. Inputs containing Cyrillic, CJK scripts or emoji can return corrected distances or a different closest match.
- `distanceUnicode` now returns the same result as `distance`. Both Unicode subpaths remain available for existing imports.
- **Behavior change.** Distance functions now throw `TypeError` for non-primitive string inputs, including boxed `String` objects, numbers, `null` and `undefined`. `closest` applies string validation to the query and candidates it compares. `distanceMax` and `closest` reject `BigInt` and `Symbol` thresholds. A rejected call no longer corrupts later distance results.
- `/slim` and `/slim/min` export `distanceSlim(a, b)` for full UTF-16 code-unit distance. It uses v2's unrolled kernels at lengths 3–16 and shares one full-width lookup table across all lengths.
- The package is source-available under AGPL-3.0 with WATT3D Additional Terms. See [LICENSE](./LICENSE) and [ADDITIONAL_TERMS.md](./ADDITIONAL_TERMS.md).

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

# Default Wide-Table Spike

> **Status: promoted.** `src/peq.js` and `src/myers_x64.js` now have the shape prototyped here, so the tables below describe the default API before promotion. `core/` is kept as the record of what was verified and measured. `derive-core.js` checks for the old `src` shape and now stops with a re-review message; `verify.js` and `measure-size.mjs` compare `core/` with a `src` that is equivalent to it.

Prototype of a default entry point (`distance`, `distanceMax`, `closest`) that is correct for every UTF-16 code unit, not only ASCII and Latin-1.

## The problem

The production default API binds its short and threshold kernels to a 256-entry PEQ table. A code unit above 255 never matches anything, including itself, so text outside Latin-1 gets an overstated distance:

| Call | Production default | Correct |
| --- | ---: | ---: |
| `distance("привет", "привед")` | 6 | 1 |
| `distance("日本語", "日本人")` | 3 | 1 |
| `closest("привет", ["zzzzzz", "привед"])` | `"zzzzzz"` | `"привед"` |

`distance` switches to full-width tables above 64 code units, while `distanceMax` and `closest` stay on the 256-entry table at every length, so the two disagree on long non-Latin-1 strings.

## The idea

The default entry point already allocates two 65,536-entry lanes for its long-string kernel. Calls are synchronous and every kernel zeroes what it wrote before returning, so the short, blockwise, threshold and long kernels can all take turns on those two lanes. The 256-entry table is then unnecessary.

Only two modules differ from production:

- `core/peq.js` exports the two full-width lanes.
- `core/myers_x64.js` borrows those lanes instead of owning its own.

Every other file in `core/` is a byte-for-byte copy of `src/`, produced by `derive-core.js`.

## Commands

Run from the repository root.

```bash
node bench/default-wide-spike/derive-core.js
node bench/default-wide-spike/derive-core.js --check
node bench/default-wide-spike/verify.js
node bench/default-wide-spike/measure-size.mjs --out-dir=<external-directory>
```

`verify.js` is correctness only. `measure-size.mjs` builds the spike with the production Closure pipeline into a directory outside the checkout and compares bundle bytes. Neither performs timing.

## What is established

- The wide core agrees with the dynamic-programming reference for ASCII, Latin-1, Cyrillic, CJK, Latin Extended, surrogate pairs and table-edge code units, across both dispatch edges, for `distance`, `distanceMax` and `closest`.
- On ASCII and Latin-1 input it returns exactly what production returns, including over-threshold values from `distanceMax`.
- Both lanes are zero after every call.
- Static table payload is 512 KiB, against about 513 KiB today.
- The Closure bundle is within a few tens of bytes of the production default bundle.

## What is not established

- Results on other machines or Node versions. A [paired A/B run](../paired-ab/README.md) of this core against production on one Windows x64 host with Node 24 found no difference outside the method's noise floor of about 1% for `distance`, `distanceMax` or `closest` on alphanumeric input, at lengths from 2 to 300.

## If promoted

- `src/peq.js` and `src/myers_x64.js` change as above; no kernel body changes.
- The default API would return lower, correct distances for text outside Latin-1. That is a behavior change for anyone relying on the old numbers.
- `distanceUnicode` would behave the same as `distance`. The `/unicode` subpath could stay as a compatible alias.
- README text on character tables and the PEQ memory inventory would need updating.

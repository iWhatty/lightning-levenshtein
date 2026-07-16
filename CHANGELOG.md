# CHANGELOG — `lightning-levenshtein`

> Initial cut seeded from `git log` by the host repo's `tools/seed-changelogs.mjs` script. Version groupings infer release boundaries from tags and commit subjects; rough cuts are expected — review and tighten as part of normal maintenance.

## 0.0.5 — 2026-05-23

- **feat(exports): `./v2` now routes bundlers at ESM source via the `import` condition.** Pre-0.0.5 the `./v2` export was pre-built-blob only — consumers got the full 41 KB GCC ADVANCED-compiled bundle even if they only called `levenshteinLightning` on short strings (where most of the bit-parallel myers_x kernels are dead code). The v2 source moved from `bench/bolt/` to `src/v2/` (8 files: `index.js` entry + 7 myers kernels) and the `./v2` export now follows the same dual-condition pattern as `.` and `./unicode`:
  - `import` → `./src/v2/index.js` (raw ESM, tree-shakeable)
  - `default` → `./dist/lightning-levenshtein-v2.min.js` (pre-built blob fallback for CJS consumers and bundlers that don't honor `import`)
- **feat(exports): new `./v2/min` subpath** for consumers that explicitly want the pre-built blob. Mirrors the `./unicode/min` and `./min` convention. Same `.d.ts` as `./v2`.
- **chore(build): `build-gcc-bolt.mjs` now points at `src/v2/`** instead of `bench/bolt/`. Pre-0.0.5, `build:v2` globbed `bench/bolt/*.js` and let Closure's PRUNE dependency mode tree-shake from the entry — that worked but mixed lib source with bench-only experiment files (myers32-fast-v1-hand-1-2.js, lev-dispatch.js, etc.) in the build inputs. Now only the 8 v2 files are inputs; the other bench/bolt/ files remain in place as standalone benchmark variants.
- **chore(pkg): `files` whitelist unchanged** — `src/` was already included, so `src/v2/` ships in the tarball automatically.
- No behaviour change for existing consumers of `./v2` (the `default` condition still resolves to the same `.min.js`). Closes the `lightning-levenshtein /v2` ESM-source-routing sub-bullet under host carry-forward #6.

## Unreleased — 2026-05-19

- fix(v2): propagate unsigned addition carries in the 33–64 and 65–96 character specialized Myers kernels; the missing carry could overstate distances for mixed and repeated inputs.
- test(v2): cover source and minified builds against a deterministic reference implementation at every production dispatch boundary.

- chore(license): finalize AGPL-3.0 + WATT3D Additional Terms metadata  `693bb5d`
- chore(pkg): update GitHub repo URL after rename  `4fa7776`

## 0.0.4 — 2026-05-19

- chore: normalize README shields row  `056ba78`
- chore: rebrand author to WATT3D, interim license  `b114345`
- feat: relicense to AGPL-3.0 + WATT3D AI Training Rider  `17affb7`
- chore: deploy WATT3D AI-bot robots.txt policy  `737eb61`
- chore: revise AI Training Rider (v2 — pre-counsel drafting fixes)  `83d0796`
- chore: rider v3 — remove gameable 0.1% safe harbor  `3697a44`
- chore: rider v4 — Commercial Use restricted to Fully Open Source  `8c3b37b`
- docs(README): apply @whatty README template  `fb1630b`

## 0.0.3 — 2026-05-13

- Initial commit  `a1a04a6`
- Initial Commit for 0.0.1v of  lightning-Levenshtein  `5d471c8`
- Double checked that the test cases and benchmarks were running smooth. Setup GCC compiler for DIST output.  `29ffb90`
- Added options to set the string length in the HTML benchmark  `8a3ca9f`
- Prepping for NPM publish. Doing more browser tests. Node perf is quite different than the V8 engine  `737eef5`
- Testing broswer vs node optimzations.  `59f86a7`
- Experimenting with a dispatcher called levenshtein-lightning-v2.  `6d70c78`
- TODO clean up the HOT loops in SRC  `8a2374e`
- Added bench test for new function unroll, the inner hot-loop, to handle cases where the length of b is known and fixed.  `740eacf`
- Updated Benchmark, testing now myer_x variations  `fb0dcf7`
- perf(myers): optimize myers_x kernel and add browser/node variant benchmark harness  `c41059e`
- perf(myers): restore block-local myers_x core and unlock new benchmark lead  `092ac36`
- Prepping for benchmark reelease  `6e89b57`
- re-organized repo, added bench suite for myers32 variants  `35c2f90`
- updated unrolled_A to use v4, and updated lightning-v2 to use the new unrolledA_v4  `1d9abb6`
- Benchmark packges is stable, good data table and graphs  `6f4f982`
- finished benchmarks and updated readme  `e5863e5`
- changes to ops/ms  `0c29be9`
- updated git ignore and added main build script  `c30ed00`
- ran a few more bench runs and updated readme  `8d76e68`
- added  the myers_x64, dual 32-bit word varient to main src , ran more benchmarks  `328e1ea`
- updated package.json script to build all charts post benchmark  `f323322`
- updated data table in readme  `75c54e9`
- ran a few more benches  `cf4f724`
- cleaned up unused imports, updated readme wording  `b00b0d9`
- shipped v0.0.1 and v0.0.2 to npm updated main/module in package.json  `f157943`
- Polish repo workflow and bench spikes  `bb41b05`
- Add unicode entrypoint and release checks  `917a256`
- Fix CI test command and bench dist casing  `0a56dce`
- Harden closure export rewrites  `538848a`
- Add release package smoke checks  `434af2e`
- Clarify package entrypoint positioning  `ff1277c`
- Add package declaration smoke check  `bb4d91d`
- Update CI actions to Node 24 runtimes  `3850325`
- Add local CI check script  `7e8cb48`
- Make package pack check hermetic  `bde0c6f`
- Mark package as side-effect free  `c6f6381`
- Guard npm publish with local CI  `978b24d`
- Assert installed package metadata  `570fee7`
- Avoid hardcoded package version checks  `68dddd0`
- Check committed build artifacts  `7159968`
- Sort Closure build inputs  `d3870f5`
- Allow Closure line wrapping in artifact check  `4cddb49`
- Remove unstable artifact diff check  `66c32eb`
- Document CI policy lessons  `de9d08f`
- Refresh agent command notes  `a563df8`

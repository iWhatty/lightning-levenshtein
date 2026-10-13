# CHANGELOG — `lightning-levenshtein`

> Initial cut seeded from `git log` by the host repo's `tools/seed-changelogs.mjs` script. Version groupings infer release boundaries from tags and commit subjects; rough cuts are expected — review and tighten as part of normal maintenance.

## Unreleased

- fix(build): claim Closure temporary entries and staged outputs exclusively, preserve pre-existing files on collision, and clean up only files created by the current build.
- fix(bench): require external measured-run output, import validated raw repetitions without overwriting evidence, and recompute aggregate statistics and provenance before qualification promotion.
- fix(bench): reject incomplete workload matrices, missing checksum/protocol/runtime evidence, inconsistent measurements, and unknown package/dependency versions.
- fix(package): execute the verified npm JavaScript CLI through Node with literal arguments instead of Windows shell command strings.
- test(package): derive ambient declaration exports from TypeScript semantics and validate conditional-export order, including real consumer resolution tests.
- docs(maintenance): add durable review-hardening task plans and an independent audit record; distinguish legacy fixed-order evidence from the current rotating harness.

- test(package): parse declarations with the TypeScript compiler API and lock value/type-only exports across all eight public subpaths.
- refactor(package): share one path-safe declaration validator across workspace and packed-install checks.
- test(package): reject declaration targets that escape a package root through filesystem links.
- refactor(package): share exact npm metadata validation across dry-run and installed-tarball checks.
- test(package): lock legacy npm entrypoints and repository identity in the shared metadata contract.
- refactor(package): share TypeScript compiler invocation between workspace and packed-install smoke checks.
- test(package): compile strict NodeNext, no-emit TypeScript consumers from workspace and packed installs across all eight public subpaths, including valid profile types and intentional invalid-usage assertions.
- docs(package): document all eight explicit declaration conditions, export-map-aware TypeScript resolution, and profile type-only imports.
- chore(bench): remove the obsolete `bench:packages:all` shortcut; measured runs require explicit external output and separate evidence review and promotion.
- test(source): reject relative imports that resolve to directories; repository imports must name files.
- Reject prototype-inherited names such as `constructor` and `toString` as unknown text profiles instead of treating them as table widths.
- Make Closure builds fail closed when tracked externs are missing or omit configured public exports, and add the missing `createDistance` profile declaration.
- fix(build): reject canonical collisions among Closure entries, outputs, copies, and derived staging files before filesystem mutation.

- bench(diagnostics): aggregate compatible raw repetitions into paired throughput and baseline-ratio statistics with strict evidence guards.
- fix(codegen): correct the experimental Myers32 B score recurrence, give it full UTF-16 PEQ coverage, enforce its supported input domain, and add shared generated-output drift checks.
- refactor(build): centralize Closure compilation, temporary-entry cleanup, and ESM export recovery while preserving production bundles byte-for-byte.
- refactor(build): invoke Closure with an argument array instead of a shell command string, preserving paths containing spaces or shell metacharacters.
- fix(build): preflight entry/compiler/extern inputs and reject empty, unsafe, or duplicate public export names before creating build outputs.
- fix(build): compile and validate through an ignored staging output so compiler or export-rewrite failures do not overwrite the last valid published bundle.
- fix(build): atomically replace staged Closure bundles after export validation, preserving the last valid publication if replacement fails.
- fix(build): publish configured secondary copies through same-directory staging and atomic replacement, preserving existing copies on failure.
- refactor(package): centralize public subpaths, declarations, metadata, bundle checks, npm invocation, and exact tarball expectations for release validation.
- refactor(package): share one runtime API contract between workspace and packed-install smoke checks.
- test(package): lock every public subpath to its exact type, source-import, and minified-default targets in workspace and packed manifests.
- fix(bench): centralize CLI validation and accept pnpm's standalone argument separator in benchmark commands.
- fix(bench): reject duplicate raw run identifiers during aggregation and share run compatibility checks across evidence pipelines.
- test(source): verify relative import casing component-by-component so Windows catches paths that would fail on Linux and in npm consumers.
- test(policy): enforce disabled cloud CI, pnpm lock ownership, exact package-manager pinning, and repository npm credential hygiene in the local release gate.
- fix(bench): exclude run identity and output-directory metadata from package aggregation configuration matching.
- fix(bench): bind package aggregates to matching checksums, seeds, targets, revisions, runtimes, protocols, and dependency versions.
- fix(build): exclude stale generated entry files from Closure inputs while retaining the active temporary entry deterministically.
- docs(status): reconcile profile release and benchmark-hardening status after npm `0.0.6`.

## 0.0.6 — 2026-07-16

- fix(v2): propagate unsigned addition carries in the 33–64 and 65–96 character specialized Myers kernels; the missing carry could overstate distances for mixed and repeated inputs.
- test(v2): cover source and minified builds against a deterministic reference implementation at every production dispatch boundary.
- chore(codegen): make the Myers32 A generator own both its benchmark artifact and production v2 output, with a non-mutating drift check in the release gate.
- ci: validate the documented Node.js 18 minimum alongside the Node.js 24 development target.
- chore(bench): repair the small-dispatch spike after production v2 kernels moved from `bench/bolt` to `src/v2`.
- test(tooling): syntax-check repository JavaScript and resolve relative imports in the release gate without executing benchmark workloads.
- docs(design): map real-world Levenshtein uses to explicit string, byte, and dense-token profiles, including current per-worker PEQ memory costs and a staged configuration proposal.
- docs(design): add a source register, stable-core integration scope, public PEQ memory inventory, correctness gates, and worker-scaling benchmark plan.
- refactor(core): expose the stable two-lane long kernel through a table-bound factory while retaining the existing pre-bound export.
- bench(profiles): add a bench-only stable dispatcher prototype covering ASCII, Latin-1, and full code-unit widths with checked and unchecked policies.
- docs(memory): correct `/unicode` static PEQ payload to three full-width lanes, or 768 KiB per worker.
- bench(profiles): add isolated 1/2/4/8-worker throughput and memory measurements for the stable profile prototype.
- feat(profiles): add `/profiles` and `/profiles/min` factories for explicit ASCII, Latin-1, and code-unit workloads with checked or prevalidated input policies.
- fix(build): remove temporary `globalThis` export bridges from generated ESM bundles under current Closure output syntax.
- docs(strategy): add a durable technical reflection and benchmark-hardening sprint, and reconcile profile/CI documentation drift.
- bench(packages): add deterministic balanced target ordering, reference and checksum guards, raw qualification runs, reproducibility metadata, and paired multi-run stability aggregation.
- bench(diagnostics): add deterministic workload families and a correctness-first matrix across every production v2 dispatch boundary and compatible text profile.
- bench(evidence): route every README renderer through an explicit promotion manifest with qualification, provenance, and public-claim guardrails.
- ci(policy): disable the paid GitHub Actions workflow and make local Windows/Linux/macOS and Node-version gates the maintained verification path.
- docs(testing): document pnpm-based Node switching, isolated alternatives, primary sources, and rules for separating historical matrix results from current-commit evidence.
- docs(api): document npm installation, the Node minimum, and the complete `/profiles` API alongside the other public entrypoints.
- test(docs): validate local Markdown targets and retain external citations in the source-backed design, licensing, and Node-version documents.
- docs(community): clarify source-available positioning and add contribution and security guidance.
- chore(pkg): assert licensing, repository, engine, public-publish metadata, and the exact tarball allowlist; add report-mode pack inspection and exclude the repository-only crawler policy.

## 0.0.5 — 2026-05-26

- **feat(exports): `./v2` routes bundlers to ESM source via the `import` condition.** The v2 runtime source moved from `bench/bolt/` into `src/v2/`, while the `default` condition retains the pre-built bundle.
- **feat(exports): add `./v2/min`** for consumers that explicitly select the pre-built v2 bundle.
- **chore(pkg): declare Node.js 18 as the minimum runtime**, align package smoke tests with every published subpath, and rebuild release artifacts.
- **chore(pkg): update repository, issue, and homepage metadata** after the canonical GitHub repository rename.
- No behavior change for existing consumers of the v2 pre-built bundle.

## 0.0.4 — 2026-05-19

- chore: normalize README shields row  `056ba78`
- chore: rebrand author to WATT3D, interim license  `b114345`
- feat: relicense to AGPL-3.0 + WATT3D AI Training Rider  `17affb7`
- chore: deploy WATT3D AI-bot robots.txt policy  `737eb61`
- chore: revise AI Training Rider (v2 — pre-counsel drafting fixes)  `83d0796`
- chore: rider v3 — remove gameable 0.1% safe harbor  `3697a44`
- chore: rider v4 — Commercial Use restricted to Fully Open Source  `8c3b37b`
- docs(README): apply @whatty README template  `fb1630b`
- feat(exports): route default and `/unicode` ESM consumers to source while retaining explicit pre-built bundle subpaths  `8950a2d`
- chore(license): finalize AGPL-3.0 + WATT3D Additional Terms metadata  `693bb5d`

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

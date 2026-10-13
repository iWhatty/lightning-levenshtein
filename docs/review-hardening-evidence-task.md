# Raw benchmark evidence validation task

Status: complete, independently audited, and included in the passing final gate. See the [audit record](./review-hardening-audit.md). Owner: evidence schema subagent. Review finding: incomplete evidence accepted as compatible.

## Scope and design

Own `bench/packages/aggregate.js`, `bench/diagnostics/aggregate.js`, `bench/run-evidence.js`, `test/benchmarkHarness.test.js`, and `test/diagnosticAggregation.test.js`. A narrowly scoped raw-evidence helper or test fixture may be added if necessary; report its path before another lane depends on it. Do not edit the runners, promotion code, or another task document.

Inspect the real runner output before choosing required fields. Validate document and metadata shapes, required checksum values, configured lengths and seeds, target identities, diagnostic families, and measurement values. Reject empty, missing, duplicate, and unexpected matrix entries where they would make evidence incomplete or ambiguous. Do not require clean revisions for diagnostic aggregation; dirty evidence may be analyzed but must remain explicitly dirty and ineligible for qualification promotion.

## Chosen design (2026-10-05)

- Validate each raw document before comparing signatures. Require runner-shaped metadata, explicit revision/runtime/package provenance, configured nonempty unique matrices, valid eight-digit lowercase hexadecimal checksums, and complete finite positive timing samples. Dirty diagnostic revisions remain valid; mixed dirty state remains incompatible.
- Package raw runs must cover every configured length and seed with the six runner targets. Each target at a length must carry identical per-seed dataset and expected-distance checksums; reject extra lengths/targets and duplicate seeds.
- Diagnostic raw runs must cover each configured family, length, and seed. Family definitions and domain target sets must match runner definitions; `targetOrder` and `measurements` must identify the complete domain target set. Reject extra families/lengths/seeds/targets and verify-only data.
- Keep both aggregation entrypoints and output fields unchanged. Retain compatibility signatures that ignore repetition/run ID/output routing, but include configuration, revision, runtime, dependency provenance, and checksum evidence. Share small shape/assertion helpers in `bench/run-evidence.js`. Check primary throughput against calls/elapsed within relative tolerance `1e-10`; do not trust redundant precomputed summaries.
- Regression fixtures in the two owned tests will model current runner output; no new helper path planned.

## Implementation evidence

- Changed owned paths: `bench/packages/aggregate.js`, `bench/diagnostics/aggregate.js`, `bench/run-evidence.js`, `test/benchmarkHarness.test.js`, `test/diagnosticAggregation.test.js`, and this document. No runner, promotion, runtime, or checked-in evidence change from this lane.
- `rtk pnpm test --runInBand test/benchmarkHarness.test.js test/diagnosticAggregation.test.js test/benchmarkWorkflow.test.js`: 3 suites, 21 tests passed. Included workflow suite to confirm aggregation API compatibility.
- `rtk pnpm run test:source`: passed; 148 JavaScript files and 199 relative imports checked.
- `rtk git diff --check -- bench/packages/aggregate.js bench/diagnostics/aggregate.js bench/run-evidence.js test/benchmarkHarness.test.js test/diagnosticAggregation.test.js docs/review-hardening-evidence-task.md`: passed.
- Compatibility: aggregation entrypoints and output fields unchanged. Older partial/synthetic raw files lacking full runner metadata, target sets, protocol fields, checksums, or measurement fields now fail intentionally. Diagnostic command `outDir` and package command `outDir` remain output routing, not compatibility settings. Dirty diagnostic runs aggregate when revision provenance is explicit; unknown commit is rejected as missing provenance. Runner-generated raw shapes remain accepted.
- Audit note: descriptive diagnostic target catalog is kept in aggregation code to avoid importing runtime kernels; test compares it with `targetsForDomain` so target drift fails locally.

## Audit correction

- Evidence audit reproduced literal `unknown` package/dependency versions passing as matching provenance in every raw run. Package aggregation now rejects that sentinel, including whitespace/case variants, while accepting legitimate prerelease version strings. No generic version parser added.
- `rtk pnpm test --runInBand test/benchmarkHarness.test.js test/benchmarkWorkflow.test.js`: 2 suites, 17 tests passed after correction.

Keep the public `aggregateRuns` and `aggregateDiagnosticRuns` entrypoints stable for the workflow lane. Compatibility checks must still reject mixed settings, revisions, runtimes, and dependency evidence while ignoring repetition identity and output routing.

## Acceptance tests

- Valid complete runner-shaped fixtures aggregate with unchanged statistics.
- Missing or invalid dataset and expected-distance checksums fail even when every run omits them identically.
- Missing provenance fails with actionable errors rather than becoming an omitted JSON signature field.
- Declared lengths `[8,16]` and seeds `[1,2]` cannot aggregate only length `8`, seed `1`.
- Duplicate seeds, incomplete families, inconsistent target sets, unexpected matrix entries, and verification-only documents fail.
- Dirty but otherwise valid diagnostic data remains analyzable; mixed revision state still fails compatibility checks.

## Evidence and completion

The focused implementation evidence above is supplemented by the final integrated gate and independent audit. Unknown-version provenance was corrected during audit without adding a generic semver parser or changing either aggregation API.

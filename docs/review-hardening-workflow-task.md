# Qualification collection and promotion task

Status: complete, independently audited, and included in the passing final gate. See the [audit record](./review-hardening-audit.md). Owner: evidence workflow subagent. Review findings: qualification dirties itself and promotion trusts edited summaries.

## Scouting and chosen design (2026-10-05)

- Package runner defaults to checked-in `qualification/raw`; diagnostic runner always writes `results/raw`. Both read Git status before measurement, so run 1 dirties runs 2/3. Package aggregation accepts arbitrary file paths and stores their spelling. Promotion currently checks raw schema/run ID only, not measurements or computed summary.
- Measured runners will require an explicit `--out-dir` resolving outside the repository (including symlink aliases); relative paths resolve from the process working directory. Verification remains write-free. Output file creation will be exclusive; run IDs cannot overwrite prior evidence. This makes storage deliberate and leaves Git status sensitive to real source/dependency/configuration edits between repetitions.
- A new explicit import CLI will validate every raw document as a set using the existing package/diagnostic aggregators before copying bytes into each lane's checked-in raw directory. It will retain run IDs, reject destination collisions, and reject input path aliases. Aggregation CLIs will accept only imported raw paths and store canonical repo-relative paths.
- Package promotion will resolve aggregate and raw paths through filesystem canonical paths, require expected qualification directories, reject duplicate aliases, and reaggregate all raw files using stored baseline. Compare all semantic fields with recomputation; exclude only generated aggregate timestamp and source-file routing after independent path checks. This covers statistics, command, workload, and provenance.
- Evidence schema lane owns aggregator internals and raw shape validation. Workflow lane owns runners, import/aggregation CLIs, promotion filesystem checks, docs, and workflow tests. Synthetic tests will use runner-shaped inputs; no timed qualification, public promotion write, runtime edit, or Git exclusion.

## Scope and design

Own `bench/packages/run-bench.js`, `bench/packages/aggregate-runs.js`, `bench/packages/evidence.js`, `bench/packages/promote-aggregate.js`, `bench/diagnostics/run-workload-matrix.js`, `bench/diagnostics/aggregate-runs.js`, `bench/packages/qualification/README.md`, `bench/diagnostics/README.md`, `test/benchmarkEvidence.test.js`, and new workflow-specific helpers/tests. Do not modify aggregation implementations or `bench/run-evidence.js`; coordinate their API with the evidence schema lane.

Choose a collection/import design that preserves raw evidence and catches real source changes without making the second repetition dirty solely because the first produced evidence. Prefer output outside the checkout followed by explicit import. Document exact portable commands and keep aggregation/promotion paths reproducible after import. Avoid broad ignore rules or silently masking tracked changes.

At promotion, load the referenced raw documents, validate and reaggregate them with the selected baseline, then compare the stored aggregate's statistics, command, workload, and provenance with the recomputed content. Exclude only non-semantic generated timestamps or storage routing where justified. Keep the current legacy promotion unchanged. Resolve filesystem aliases when checking containment and duplicate inputs.

## Acceptance tests

- An isolated clean Git fixture can collect at least three synthetic repetitions without raw artifacts changing recorded source cleanliness; a real source edit is detected.
- Import retains each raw run identity and refuses silent collisions or outside-root promotion references.
- A valid three-run aggregate with actual raw files passes promotion validation.
- Edited means, ratios, sample counts, command, clean-revision metadata, or raw measurements fail recomputation checks.
- Missing, duplicated, aliased, malformed, or escaped raw files fail; legacy public data still normalizes unchanged.
- Tests use synthetic evidence, never timed qualification or public promotion writes.

## Evidence and completion

The implementation and audit corrections below preserve the original raw bytes and run IDs. Incomplete historical fixtures are rejected, not rewritten to appear qualified. The current public legacy promotion remains unchanged.

## Implementation record (2026-10-05)

- Changed `bench/packages/run-bench.js` and `bench/diagnostics/run-workload-matrix.js`: measured mode requires external `--out-dir`; path containment checks resolve both lexical and filesystem aliases. Output files use exclusive creation. Verification mode still writes nothing. Diagnostic `meta.command` excludes storage routing.
- Added `bench/evidence-files.js` and `bench/import-runs.js`: preflight all external raw files and aggregator schema, reject duplicate physical paths and run IDs, preserve original bytes and run IDs, refuse destination collisions. Package and diagnostic aggregation CLIs now read only their imported raw directories, store canonical paths, and refuse overwrite.
- Changed `bench/packages/evidence.js` and `bench/packages/promote-aggregate.js`: raw and aggregate paths must resolve inside their qualification directories; duplicate or aliased raw labels fail. Every qualified aggregate is rebuilt from referenced raw documents with its baseline. Full semantic object must match, including statistics, command, workload, and source-run provenance. Only aggregate `generatedAt` and validated `sourceFiles` routing are excluded from equality. Legacy `results.json` path remains valid and unchanged.
- Updated package and diagnostic benchmark READMEs with external collection, explicit import, and aggregate sequence. `bench:packages:all` is documented as obsolete for qualification.
- Added `test/benchmarkWorkflow.test.js`: clean isolated Git fixture with three synthetic repetitions and real source edit; junction/symlink path checks; package and diagnostic import/aggregate paths; collision and batch preflight; valid raw-backed promotion, edited summaries/metadata, missing/duplicate/aliased/escaped/malformed raw evidence, and outside-root promotion CLI without manifest write. Audit found earlier tests briefly wrote synthetic raw files into checkout; fixed by copying minimal production benchmark modules into disposable external fixture roots. Tests now write no checkout evidence or promotion files. Independent raw mutation with internally consistent measurement and per-run summary also fails aggregate recomputation.
- Final containment follow-up: both aggregation CLIs now preflight their aggregate output directories before creating or writing. Disposable fixture junction regressions prove package and diagnostic aggregation reject an output directory resolving outside repository; external target remains unchanged. Exclusive output creation remains in place.
- Focused result: 4 suites / 26 tests passed (`benchmarkWorkflow`, `benchmarkEvidence`, `benchmarkHarness`, `diagnosticAggregation`) before final workflow additions; final isolated workflow suite 8/8 passed. `test:source`, `test:docs`, and `git diff --check` passed after output-containment follow-up; legacy `bench:packages:promotion:check` passed before it. Coordinator owns full gate rerun. No timed run, public promotion write, CI dispatch, commit, push, or publication.

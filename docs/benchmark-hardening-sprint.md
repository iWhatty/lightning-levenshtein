# Benchmark Hardening Sprint

## Objective

Strengthen the benchmark harness so algorithm decisions and public claims remain trustworthy across workload shapes, JavaScript engines, and hardware families.

This sprint changes measurement design and reporting. It does not select a new production kernel, publish a new npm version, or run benchmarks on a busy machine.

## Operating Rules

- Do not run qualification benchmarks while substantial background work is active.
- Run correctness checks before performance measurement.
- Preserve every raw qualification run; never keep only a rendered mean.
- Keep machine results separate. Compare within-machine ratios and rankings rather than averaging absolute ops/sec across hardware.
- Use deterministic seeds and reproducible target ordering.
- Construct profile factories outside timed regions.
- Keep benchmark workloads out of normal CI.

## Workstream 1: Harness Integrity

### Tasks

- Add a deterministic target-order schedule derived from seed and repetition. Every target should occupy each order position approximately equally.
- Add correctness verification or a checksum before timing so every target produces the expected result on the measured dataset.
- Record the git commit, package versions, command configuration, Node/V8 versions, OS, architecture, CPU model, logical-core count, and run identifier.
- Record individual complete-suite repetitions rather than overwriting one `results.json` file.
- Add an aggregator that reports median, mean, minimum, maximum, standard deviation, coefficient of variation, and paired ratio to the selected baseline.
- Separate qualification output from README-rendered output. README data should be promoted intentionally from a named qualification set.
- Document target-order, warm-up, batching, and timer-overrun behavior in the raw metadata.

### Acceptance Criteria

- Re-running with the same configuration produces the same datasets and target-order schedule.
- A deliberately incorrect target fails before timed results are accepted.
- Raw results identify the exact source revision and dependency versions.
- Three complete runs can be aggregated without manual file editing.
- Renderers consume an explicit aggregate artifact, not an implicitly latest run.

## Workstream 2: Workload Matrix

### Core workload families

| Family | Purpose |
| --- | --- |
| Random equal-length ASCII | Preserve continuity with existing claims |
| Exact and one-edit pairs | Model cache hits, spell checking, and near matches |
| Shared prefix/suffix | Exercise workloads where DP implementations trim aggressively |
| Unequal lengths | Cover insert/delete-heavy comparisons and dispatcher asymmetry |
| Repeated/tiny alphabets | Stress carry propagation and PEQ reuse |
| Latin-1 | Exercise the 256-entry profile near its upper bound |
| BMP code units | Exercise `/unicode` and `codeUnit` profiles above 255 |

### Required dispatch edges

Measure both sides of every production v2 boundary:

- 1/2/3;
- 31/32/33;
- 63/64/65;
- 95/96/97;
- 127/128/129;
- 223/224/225;
- 255/256/257;
- 511/512/513.

The public package comparison may retain the compact powers-of-two table. Boundary and workload matrices should remain separate diagnostic artifacts so the README does not become unreadable.

### Acceptance Criteria

- Every workload family has a deterministic generator and documented symbol semantics.
- Every target is verified against a simple reference on the generated pairs.
- Results identify workload family rather than mixing families into one aggregate score.
- Profile benchmarks distinguish `throw` from `assume-valid` and never time factory construction accidentally.

## Workstream 3: Stability Qualification

### Protocol

1. Let the machine settle and record relevant background-load notes.
2. Run the entire qualification suite three times in separate processes.
3. Preserve raw results from all repetitions.
4. Inspect paired ratios and coefficient of variation per workload and length.
5. Repeat suspicious tiers rather than deleting inconvenient samples.

Cooling and stable ambient temperature reduce throttling risk, but the protocol must still account for JIT compilation, garbage collection, scheduler placement, CPU frequency policy, and unrelated system activity.

### Provisional regression rule

Do not set a fixed performance gate until repeated baseline runs establish the normal noise floor. After that, flag a tier for investigation when its paired median regression exceeds:

```text
max(3%, 2 × baseline coefficient of variation)
```

This is an investigation threshold, not an automatic rejection rule. Correctness, bundle size, memory, and neighboring tiers remain part of the decision.

## Workstream 4: Cross-Platform Matrix

### Qualification platforms

| Family | Candidate systems | Value |
| --- | --- | --- |
| Intel x86-64 | Current i5-13600K Windows host | Existing baseline and hybrid-core scheduler behavior |
| AMD x86-64 | Stable desktop/server host | Different cache, branch, and integer execution characteristics |
| Apple Silicon | M1 and M5 macOS hosts | ARM64, different JIT/backend and memory hierarchy |

Run the documented minimum Node major and current development Node major where practical. Browser work should record the exact browser and engine version; Chrome/V8, Firefox/SpiderMonkey, and Safari/JavaScriptCore results must remain separate.

### Reporting rules

- Never average Intel, AMD, and Apple absolute throughput together.
- Report per-machine winner, within-machine ratio to `fastest-levenshtein`, and stability statistics.
- Treat agreement across machines as stronger evidence than one pooled score.
- Preserve disagreements. A kernel that wins on one engine and loses on another is a dispatch or packaging question, not a bad datapoint.

## Workstream 5: Claim and Documentation Policy

### Tasks

- Generate README claims only from a named, checked-in qualification aggregate.
- Include workload and environment in every headline claim.
- Keep browser and Node claims separate.
- Add a results index linking raw repetitions, aggregate files, charts, commit, and environment.
- Document competitor versions and explain exclusions such as `fast-levenshtein` delegating to `fastest-levenshtein`.
- Add a benchmark-review item to the release checklist without making benchmarks mandatory in CI.

### Acceptance Criteria

- No generated highlight can say merely "fastest" without naming its benchmark scope.
- A reader can reproduce the displayed table from checked-in raw inputs and commands.
- Historical qualification sets remain available when a new set is promoted.

## Suggested Delivery Order

1. Raw-run directory and metadata schema.
2. Deterministic target-order rotation.
3. Correctness/checksum guard.
4. Three-run aggregator and stability statistics.
5. Workload generators and dispatch-edge diagnostic suite.
6. README promotion workflow and claim guardrails.
7. Quiet-host Intel qualification.
8. AMD and Apple Silicon qualification when hosts are available.
9. Browser-engine qualification as a separate track.

## Definition of Done

- The harness can perform and preserve three complete qualification repetitions.
- Target order is balanced and reproducible.
- Incorrect implementations fail before measurements are accepted.
- Workload and dispatch-edge suites are separate and reproducible.
- Stability statistics and paired baseline ratios are generated automatically.
- README results are promoted from an explicit aggregate.
- Cross-platform results remain independent and comparable without being pooled.
- Documentation states what the evidence proves and what it does not prove.

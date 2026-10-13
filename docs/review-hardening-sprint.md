# Review hardening sprint

Started and completed: 2026-10-05. Status: implemented, independently audited, and locally validated.

This sprint closes the six findings from the deep review of the accumulated post-0.0.6 changes. The objective is trustworthy benchmark evidence and package validation, not new runtime features. The coordinator owns integration and documentation; `gpt-6-sol` subagents scout, design, implement, and independently audit the changes. The maintainer explicitly approved this available model in place of the requested Sol 6.1.

## Starting state

- Base commit: `a70f0b84cad82455162bef6c7dda8cbec25abd55` on `main`.
- The checkout already contains substantial tracked and untracked work. Preserve it; do not reset, clean, commit, push, or overwrite unrelated edits.
- Review evidence from 2026-10-04: 19 suites and 148 tests passed; 780 deterministic pairs produced 8,320 passing runtime assertions. These are historical baseline results, not completion evidence for this sprint.
- Current public benchmark selection is legacy evidence. It must remain unchanged during this sprint.

## Work lanes

| Lane | Findings | Task document | Dependencies |
| --- | --- | --- | --- |
| Evidence schema | Missing checksums and incomplete configured matrices | [Evidence schema task](./review-hardening-evidence-task.md) | None |
| Evidence workflow | Self-dirtying qualification and unverified aggregate statistics | [Evidence workflow task](./review-hardening-workflow-task.md) | Uses the evidence schema lane's aggregation API |
| npm execution | Windows shell interpretation of arguments | [npm execution task](./review-hardening-npm-task.md) | None |
| Package contracts | Ambient declaration exports and export-condition order | [Package contracts task](./review-hardening-contracts-task.md) | None |

Each owner first inspects current code and tests, records the chosen design in its task document, then implements within its exclusive file scope. Changes outside that scope require coordinator agreement. Independent reviewers receive the completed changes, task requirements, and adversarial test cases. Their findings and final validation belong in the [audit record](./review-hardening-audit.md).

## Design constraints

- Validate raw evidence before comparing or aggregating it. Matching absent fields are not evidence.
- Promotion must recompute statistics and provenance from raw inputs. A schema version and matching run ID are insufficient.
- Benchmark collection must not weaken detection of source, dependency, or configuration changes. Prefer collection outside the checkout and explicit evidence import over broad Git exclusions.
- Invoke executable JavaScript CLIs with argument arrays, not shell command strings.
- Model declaration exports using TypeScript semantics, retaining fail-closed restrictions on unsupported declaration forms.
- Preserve conditional export order as part of the package contract, and test actual resolution where practical.
- Reuse existing implementation layers. Do not introduce a generic validation framework or runtime dependencies.

## Execution and acceptance

1. Save task designs and ownership before implementation.
2. Implement regression tests that reproduce each reviewed failure, including real filesystem or consumer behavior where mocks would hide the defect.
3. Run each lane's focused checks and integrate changes without touching another lane's files.
4. Obtain independent evidence/workflow and package/tooling audits. Resolve actionable findings and rerun affected checks.
5. Run the complete local `pnpm.cmd run check:ci` gate, inspect generated bundle changes, and record the actual runtime and limitations.
6. Reconcile handoff and technical documentation, leaving an explicit completion record and any deferred platform checks.

Completion requires all six regressions covered, legacy public numbers preserved, no unresolved high-priority audit finding, and a passing local gate. A passing local run does not imply Linux, macOS, other CPUs, browsers, or other Node versions were tested.

## Safety boundaries

No GitHub Actions, npm publication, release/tag creation, legal edits, performance-claim changes, or timed qualification. Tests may create isolated synthetic evidence and temporary package fixtures; those are not qualification runs. Keep the pnpm lockfile, package version, public runtime API, and checked-in evidence intact. Clean up only temporary resources created by the current test, after verifying their location.

## Completion

All four implementation lanes and two independent audit lanes completed using `gpt-6-sol`. The six original findings are covered by regressions. Three additional audit findings were corrected before closure: unknown version provenance, workflow-test isolation, and aggregate output-directory containment.

The final local release gate passed with 22 suites and 185 tests, all four production builds, workspace and packed-install TypeScript consumers, and the exact 45-file package check. All 12 pre-sprint preservation fingerprints matched after the final build. See the [audit record](./review-hardening-audit.md) for environment and coverage limits.

Work remains uncommitted on the existing dirty checkout. No release or benchmark claim changed. Follow-up work is reviewable commit organization, maintainer-provided minimum-Node/platform checks, and quiet-host qualification using the new external collection/import procedure; none is represented as completed by this sprint.

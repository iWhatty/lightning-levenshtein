# Semantic package export contracts task

Status: implemented and independently audited; final integration tracked in the [audit record](./review-hardening-audit.md). Owner: package contracts subagent. Review findings: ambient exports omitted and condition order ignored.

## Scouting and chosen design

- TypeScript 5.9.3 `checker.getExportsOfModule` exposes bare top-level function, interface, and type declarations in an external `.d.ts` module, even without an `export` modifier. The current token-based parser silently omits those names. A declaration file with no external-module marker has no module symbol; reject it rather than treating global declarations as package exports.
- Parse once, reject syntax errors and unsupported top-level forms (including ambient modules, re-exports, default exports, values/classes/enums), and retain duplicate-name rejection. Build a TypeScript program around the source file; read actual module symbols from its checker, classify only supported function and type-only symbols, and ensure every semantic export maps to a supported top-level declaration. Keep the public signatures untouched.
- Share one ordered export-condition assertion between workspace declaration validation and packed-install validation. Compare `Object.keys` as well as target values against each canonical manifest, so moving `default` before `import` or `types` fails. Keep existing path, package-file, and symlink containment checks.
- Add regression tests for ambient value and type exports with a real TypeScript consumer compile; add condition-order mutations for source and min entries plus isolated Node resolution proof. Run focused Jest and package-types checks; coordinator owns packed-install invocation and full integration gate.

## Implementation and focused evidence

- `scripts/declaration-contract.mjs`: TypeScript checker supplies actual external-module exports. Pre-scan rejects unsupported/duplicate forms; semantic diagnostics reject invalid declarations. Pure script declarations fail closed. Public declaration files remain unchanged.
- `scripts/package-declaration-contract.mjs`: shared assertion compares exact export subpaths, each condition's key order, and target values before declaration file checks. `scripts/package-tarball-smoke.mjs` now uses this assertion, removing its unordered duplicate.
- `test/declarationContract.test.js`: actual TypeScript consumer compiles imported bare ambient function and type-only interface; parser recognizes both. Unsupported ambient forms, script-only declarations, and invalid declarations fail.
- `test/packageDeclarationContract.test.js`: unexpected bare value and type-only exports fail package contract; existing path and symlink checks remain.
- `test/packageExportConditions.test.js`: canonical eight-subpath manifest passes; moving `default` before `import` (source) or `types` (min) fails for every subpath. Isolated Node consumer resolves all eight targets, then demonstrates changed root resolution after condition reorder.
- Focused Jest: 3 suites, 28 tests passed. `node scripts/package-types-smoke.mjs` passed. `node scripts/source-smoke.mjs` passed (148 files, 198 relative imports). Tests run on Windows, current Node only. Packed-install smoke and full gate remain coordinator-owned.

## Scope and design

Own `scripts/declaration-contract.mjs`, `scripts/package-declaration-contract.mjs`, `scripts/package-contract.mjs`, `scripts/package-tarball-smoke.mjs`, `test/declarationContract.test.js`, `test/packageDeclarationContract.test.js`, and new contract-specific tests/fixtures. Do not edit `scripts/run-npm.mjs` or shared TypeScript runner behavior without coordinator agreement.

Use TypeScript's actual external-module exports when identifying public declaration value/type names. Preserve useful restrictions on unsupported forms, duplicate exports, syntax errors, and package-root containment. Reject unsupported ambient forms rather than silently skipping them. Keep current declarations and public runtime unchanged.

Treat the order of `types`, `import`, and `default` conditions as part of each export contract. Share the ordered validation between workspace and tarball checks instead of adding inconsistent copies. Where practical, assert actual Node resolution for source and explicit min subpaths in an isolated consumer fixture.

## Acceptance tests

- Ambient declarations without `export` that TypeScript exposes are included or rejected, never ignored.
- A consumer/checker proof confirms the regression case, including value and type-only symbols.
- Existing declaration syntax restrictions, duplicate checks, symlink containment, and strict consumers still pass.
- Moving `default` before `import` or `types` fails the manifest contract even when values match.
- Correct ordered manifests pass for all eight subpaths in workspace and packed install.

## Evidence and completion

The final integrated gate passed both workspace and packed-install consumers. Public declaration signatures and runtime exports remain unchanged. Independent audit found no actionable package-contract issue.

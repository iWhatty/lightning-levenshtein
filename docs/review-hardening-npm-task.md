# Shell free npm execution task

Status: implemented and independently audited; final integration tracked in the [audit record](./review-hardening-audit.md). Owner: npm execution subagent. Review finding: Windows argument strings are interpreted by a shell.

## Scouting and chosen design

Current `runNpm` uses `execSync` with a joined command on Windows; callers are `package-pack-dry-run.mjs` and `package-tarball-smoke.mjs`. Both need npm `pack`/`install`, not pnpm. Preserve helper signature and synchronous output/error behavior. Invoke `process.execPath` with `[resolvedNpmCli, ...args]` through `execFileSync`, with no shell.

Resolve in order: verified npm `npm_execpath`; npm bundled next to active Node executable; npm CLI in PATH npm-shim directories; Unix symlinked `npm` in PATH. Candidate must resolve to `bin/npm-cli.js` inside a package whose `package.json` says `name: "npm"` and whose npm bin entry points at that CLI. Ignore pnpm `npm_execpath`. No npm found: throw clear installation/resolution error, never invoke a shell shim. Keep resolver independently testable with injected environment and Node path. Test actual installed npm, pnpm environment, literal metacharacter args in a real child process, and missing npm fixtures.

## Validation and handoff

- Changed `scripts/run-npm.mjs`; added `test/runNpm.test.js`; updated this task document. Package callers unchanged.
- `rtk proxy node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand test/runNpm.test.js`: 1 suite, 5 tests passed on Windows, Node's installed npm 11.6.1. Covers direct npm `--version`, pnpm-disguised `npm_execpath`, resolver precedence and failure, and an actual child process executing a verified npm-package CLI with literal spaces, `&`, `%`, quotes, pipes, semicolons, and `$()`; working directory contains `&` and `%`. Marker for second command remains absent.
- `rtk proxy node scripts/package-pack-dry-run.mjs`: passed; 45 files, 54.7 KiB packed, 302.7 KiB unpacked.
- `rtk proxy pnpm.cmd run test:package:pack`: passed with same manifest; verifies pnpm script environment reaches npm rather than pnpm.
- `rtk proxy node --check scripts/run-npm.mjs` and `rtk proxy node --check test/runNpm.test.js`: passed. An initial source check found inline fixture imports in the concurrently edited declaration tests; the contracts owner corrected those and the integrated source check passed.
- Windows tested only. POSIX npm symlink layout supported by realpath resolution but not exercised here. Nonstandard npm wrappers without a discoverable npm-package `bin/npm-cli.js` intentionally fail with install guidance. Shared tarball check remains coordinator integration work.

## Scope and design

Own `scripts/run-npm.mjs` and a new `test/runNpm.test.js`, with narrowly scoped test fixtures if needed. Avoid editing package callers unless necessary; ask the coordinator first. Preserve `runNpm(args, { cwd, encoding })` behavior and error reporting.

Resolve the actual npm JavaScript CLI from the installed toolchain and invoke it through Node with an argument array on all supported platforms. Do not accidentally invoke pnpm just because `npm_execpath` points to pnpm. Do not fall back to shell execution. Support direct Node invocation as well as pnpm scripts, and explain a missing npm installation clearly.

## Acceptance tests

- Ordinary npm `--version` works through the public helper.
- Arguments containing spaces, ampersands, percent signs, quotes, and other shell syntax remain literal; no second command executes.
- Temporary paths with shell metacharacters work in a real subprocess fixture, not only an argument-construction mock.
- Test npm selection under a pnpm environment and failure behavior when no valid npm CLI can be found.
- Existing exact pack and packed-install checks continue to pass.

## Evidence and completion

The final integrated gate also passed packed-install validation. POSIX npm layouts remain unexecuted on this Windows host. No credentials were inspected, logged, or changed.

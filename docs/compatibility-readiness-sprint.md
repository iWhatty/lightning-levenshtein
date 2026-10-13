# Compatibility Readiness Sprint

Status: completed on 2026-10-05. Node 18 and Node 24 gates passed; independent audit findings closed. Design and task boundaries were recorded before execution.

This sprint checks the existing package and local release gate under an isolated Node 18 runtime after the [review hardening sprint](./review-hardening-sprint.md). It does not change the package API, benchmark claims, or minimum `>=18` contract. The [Node-version procedure](./node-version-testing.md) defines what a passing run can establish.

## Starting State

- The [review hardening audit](./review-hardening-audit.md) records a passing local gate on Windows x64 with Node 24.11.0: 22 suites and 185 tests, four builds, workspace and packed-install TypeScript consumers, and the exact 45-file package check.
- The current checkout has extensive tracked and untracked changes based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`. Preserve them. `HEAD` alone does not identify the tested source state.
- Node 18 evidence in the [evidence register](./node-version-testing.md#evidence-register) predates these changes. No current Node 18 result is claimed at sprint start.
- The host has no pnpm-managed Node installation. A host-wide `pnpm env use --global` switch is outside this sprint.

## Bounded Tasks

1. Obtain a portable Windows x64 Node 18.20.8 distribution in task-local temporary storage. Verify its SHA-256 against the distributor's HTTPS checksum list before use. Keep global Node and pnpm settings unchanged.
2. Record `HEAD`, `git status --short`, OS, architecture, CPU, Node, V8, npm, and pnpm versions. Label the run as dirty working-tree evidence unless a clean exact commit is tested. Record dependency-tree provenance; do not equate an existing install with a fresh frozen-lockfile install.
3. Run the existing `check:ci` with an explicit Node executable and pinned pnpm CLI. Scope `PATH` to the child process or restore it in `finally`. Verify nested pnpm scripts select that same Node and the matching npm CLI is available for packed-install checks.
4. Record the command, exit status, test/build/package results, any failure, and evidence limits in this document or a linked release record. Compare Node 18 and Node 24 evidence without calling historical results current.

## Acceptance And Limits

Acceptance requires a verified runtime archive, effective-runtime checks, completed local gate, preserved existing checkout changes, and an honest evidence record. A failed gate is useful compatibility evidence, not a completed pass; diagnose it before changing the public contract. No timed benchmarks, cloud CI, global runtime switch, npm publication, tag, release, or dependency upgrade belongs to this slice.

Passing Node 18.20.8 would support that runtime and tested working-tree state only. It would not prove Node 18.0, every Node 18 patch, other platforms, or the lower bound of the development toolchain. A future clean-commit run or isolated packed-consumer matrix can narrow those gaps if release decisions require it.

## Run Record

Run date: 2026-10-05. Windows x64, OS `10.0.19045`, Intel Core i5-13600K, 20 logical CPUs. Base `HEAD`: `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 39 tracked modified files plus untracked implementation/tests/docs at start, nothing staged. This is dirty working-tree evidence, not a test of the base commit or published npm tarball.

| Runtime | V8 | pnpm / selected npm | Existing `check:ci` result |
| --- | --- | --- | --- |
| Portable Node 18.20.8 | `10.2.154.26-node.39` | `10.33.1` / `10.8.2` | Exit 0; 22 suites, 185 tests; all four builds; runtime exports; workspace and packed-install TypeScript consumers; exact 45-file package |
| Host Node 24.11.0 | `13.6.233.10-node.28` | `10.33.1` / `11.6.1` | Fresh rerun exit 0; same 22 suites, 185 tests, four builds, consumer checks, and exact 45-file package |

Both gates also passed codegen drift, source checks (148 JavaScript files, 200 relative imports), repository policy, documentation (20 files, 65 local links at gate time), and unchanged legacy benchmark promotion. Pack inspection reported 54.7 KiB packed and 302.7 KiB unpacked. These are correctness/package checks, not performance qualification. The host rerun used `rtk pnpm.cmd run check:ci`; a separate identity probe confirmed the host still used Node 24.11.0 and the package npm resolver selected bundled npm 11.6.1.

### Runtime And Dependency Provenance

- Downloaded the official [Node 18.20.8 Windows x64 ZIP](https://nodejs.org/dist/v18.20.8/node-v18.20.8-win-x64.zip), 28,782,590 bytes, into task-created temporary storage. SHA-256 matched the [official HTTPS checksum list](https://nodejs.org/dist/v18.20.8/SHASUMS256.txt.asc): `1a1e40260a6facba83636e4cd0ba01eb5bd1386896824b36645afba44857384a`. The PGP signature was not independently verified. This end-of-life runtime was used only for compatibility testing, not installed globally.
- Invoked `node.exe` from the extracted distribution with `C:\Users\Thor\AppData\Roaming\npm\node_modules\pnpm\bin\pnpm.cjs run check:ci`. Only the child PowerShell process received the prepended runtime directory in `PATH`. Before running, `pnpm exec node -p "process.execPath"` resolved to that portable executable; nested Node reported `v18.20.8` and bundled npm reported `10.8.2`. Audit follow-up confirmed `pnpm exec pnpm exec node -p "process.execPath"` selected the same executable and nested pnpm reported `10.33.1`. The selected global pnpm shim had no adjacent `node.exe`; current package scripts and package/TypeScript child runners were inspected for runtime selection.
- The sandbox initially blocked Node 18's `lstat` of the home-directory ancestor. Approved execution outside that sandbox allowed identity checks and the full gate. No compatibility flags, symlink overrides, or weakened project checks were used.
- Reused the existing local dependency tree: Jest `29.7.0`, TypeScript `5.9.3`, Closure Compiler `20260712.0.0`. No fresh `pnpm install --frozen-lockfile` was run. Packed-consumer installation was exercised by the gate; a fresh development-dependency installation was not.

### Tested Content Fingerprint

Before and after the Node 18 run and after the Node 24 rerun, 191 validation files had aggregate SHA-256 `c2825b8f1c277a5fa5ceaa755ab205ff7a3d9d965154d772fbe8bfb5627e265b`. This includes tracked and untracked non-ignored files except Markdown, retaining published `README.md` and `docs/licensing-position.md`. Documentation-only sprint/status edits are excluded so they can record the run afterward. The four bundles, declarations, package manifest, lockfile, selected benchmark data, promotion, and four public charts are included and unchanged.

Reproduce from the repository root by passing this JavaScript to `node --input-type=module` on standard input:

```javascript
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const sha = value => createHash("sha256").update(value).digest("hex");
const files = [...new Set(execFileSync("git", [
  "ls-files", "--cached", "--others", "--exclude-standard", "-z"
], { encoding: "utf8" }).split("\0").filter(Boolean))]
  .filter(path => !path.endsWith(".md") ||
    ["README.md", "docs/licensing-position.md"].includes(path))
  .sort();
console.log({ files: files.length,
  sha256: sha(JSON.stringify(files.map(path => [path, sha(readFileSync(path))]))) });
```

This fingerprint identifies file names and bytes, not Git modes, dependency installation contents, a clean commit, or a release artifact digest. Do not describe it as proof that every `>=18` runtime or another platform passed.

## Audit And Closure

Two `gpt-6-sol` scouts implemented the isolated-runtime procedure, sprint plan, delivery map, and handoff alignment. A separate `gpt-6-sol` reviewer audited runtime selection and evidence claims and independently reproduced the 191-file fingerprint.

Audit improved the documented preflight: identity commands now reject nonzero, empty, or multi-line output; expected tool versions, shim selection, and nested pnpm/Node paths are checked. Executing the documented recipe exposed a PowerShell multiple-match case; the recipe now compares the first resolved `pnpm.cmd`, not an array of all matching applications. The corrected preflight passed with the actual runtime and CLI paths, restored `PATH`, and rejected all three invalid-output cases. Only the already-completed full-gate call was omitted from that recipe test.

Final independent review found no remaining findings. Documentation smoke passed (20 files, 67 local links, three source-backed documents); `git diff --check` passed. Removed only the task-created temporary runtime, downloaded ZIP, and preflight test helper after their processes exited. Host Node remained `v24.11.0`. No production source or tooling implementation changed during this sprint; existing changes remain uncommitted and unstaged.

## Delivery And Remaining Gates

The [release delivery map](./release-delivery-map.md) proposes dependency-ordered review groups for the accumulated changes. It does not authorize staging or committing them. Clean-commit validation, fresh dependency installation, Node 18.0 specifically, other operating systems/CPUs, browser engines, and quiet-host benchmark qualification remain separate work. No release or public benchmark claim changed.

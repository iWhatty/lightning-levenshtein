# Node-Version Testing

`package.json` declares Node.js `>=18`. That is the package compatibility contract, not a claim that every supported major is retested on every commit. Node 18 is now upstream end-of-life, while Node 22 and Node 24 are LTS releases; see the [Node.js release table](https://nodejs.org/en/about/previous-releases). The project may continue testing compatibility with an end-of-life minimum independently of upstream maintenance status.

## Canonical Gate

On every machine and Node version being qualified, record the commit, working-tree state, and runtime first, then run the same release gate:

```bash
git rev-parse HEAD
node --version
node -p "process.versions.v8"
pnpm --version
pnpm install --frozen-lockfile
pnpm run check:ci
```

On Windows PowerShell, use `pnpm.cmd` if script execution policy blocks the `pnpm` shim. Record the operating system, architecture, CPU, command result, and whether the working tree was clean. A run against uncommitted or untracked changes is working-tree evidence based on `HEAD`, not proof that `HEAD` itself passed. Do not pool benchmark measurements across Node versions, operating systems, or CPUs.

## Process-Isolated Windows Run

Use this when a maintainer has provided a trusted, portable Node distribution and changing the host-wide active runtime is undesirable. Verify the archive against the distributor's published checksum before extraction or use. Supply the extracted Node directory, the pinned pnpm CLI, and the directory containing its `pnpm.cmd` shim; do not install or activate Node globally. Run in a separate PowerShell process if possible. The `finally` block restores `PATH` in the current process even when a check fails.

```powershell
$nodeDir = "C:\path\to\node-v18.20.8-win-x64"
$pnpmCli = "C:\path\to\pnpm\bin\pnpm.cjs"
$pnpmShimDir = "C:\path\to\pnpm-shim-directory"
$nodeExe = Join-Path $nodeDir "node.exe"
$npmCli = Join-Path $nodeDir "node_modules\npm\bin\npm-cli.js"
$pnpmShim = Join-Path $pnpmShimDir "pnpm.cmd"
$expectedNode = "v18.20.8"
$expectedV8 = "10.2.154.26-node.39"
$expectedNpm = "10.8.2"
$expectedPnpm = "10.33.1"

foreach ($file in @($nodeExe, $npmCli, $pnpmCli, $pnpmShim)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing: $file" }
}
if (Test-Path -LiteralPath (Join-Path $pnpmShimDir "node.exe")) {
    throw "pnpm.cmd would select adjacent node.exe instead of selected runtime"
}

function Require-Output($label, [scriptblock]$command) {
    $result = & $command
    if ($LASTEXITCODE -ne 0 -or @($result).Count -ne 1 -or
        [string]::IsNullOrWhiteSpace([string]$result)) {
        throw "$label failed or returned no single value (exit code $LASTEXITCODE)"
    }
    return ([string]$result).Trim()
}

$savedPath = $env:PATH
try {
    $env:PATH = "$nodeDir;$pnpmShimDir;$savedPath"
    $resolvedShims = @(Get-Command pnpm.cmd -CommandType Application -ErrorAction Stop)
    $resolvedShim = $resolvedShims[0].Source
    if ($resolvedShim -ne $pnpmShim) {
        throw "PATH selected $resolvedShim instead of $pnpmShim"
    }
    $nodeVersion = Require-Output "Node" { & $nodeExe --version }
    $v8Version = Require-Output "V8" { & $nodeExe -p "process.versions.v8" }
    $npmVersion = Require-Output "npm" { & $nodeExe $npmCli --version }
    $pnpmVersion = Require-Output "pnpm" { & $nodeExe $pnpmCli --version }
    if ($nodeVersion -ne $expectedNode -or $v8Version -ne $expectedV8 -or
        $npmVersion -ne $expectedNpm -or $pnpmVersion -ne $expectedPnpm) {
        throw "Selected runtime or tool version differs from expected values"
    }
    $nestedPnpm = Require-Output "nested pnpm" { & $nodeExe $pnpmCli exec pnpm --version }
    $nestedNode = Require-Output "nested Node" {
        & $nodeExe $pnpmCli exec pnpm exec node -p "process.execPath"
    }
    if ($nestedPnpm -ne $pnpmVersion -or $nestedNode -ne $nodeExe) {
        throw "Nested pnpm command did not use selected Node: $nestedNode"
    }
    & $nodeExe $pnpmCli run check:ci
    if ($LASTEXITCODE -ne 0) { throw "check:ci failed with exit code $LASTEXITCODE" }
} finally {
    $env:PATH = $savedPath
}
```

The explicit Node executable runs pnpm. The process-local `PATH` and nested probes check the runtime selected by the current package scripts; they do not prove the behavior of arbitrary future scripts. The matching npm CLI matters because the packed-install checks invoke npm through `process.execPath`; a pnpm-only directory is insufficient. Save complete gate output. In a fresh isolated checkout, run `pnpm install --frozen-lockfile` under the selected runtime before the gate. Reusing an existing dependency tree skips that installation check; record it as a limit.

The [compatibility readiness sprint](./compatibility-readiness-sprint.md) tracks the current bounded Node 18 check separately from historical matrix evidence.

## Switching Node with pnpm

pnpm 10 can install and activate Node versions. Its official [`pnpm env` documentation](https://pnpm.io/10.x/cli/env) distinguishes `add`, which installs without activating, from `use`, which installs and makes a version current globally:

```powershell
pnpm env add --global 18 22 24

pnpm env use --global 18
pnpm.cmd run check:ci

pnpm env use --global 22
pnpm.cmd run check:ci

pnpm env use --global 24
pnpm.cmd run check:ci
```

This does not require uninstalling the existing Node installation, but `pnpm env use --global` changes the active pnpm-managed Node version systemwide. It is not a per-command sandbox. Prefer the process-isolated recipe above or a maintainer-provided Windows, WSL/Linux, or macOS machine when a host-wide switch is undesirable.

## Evidence Policy

- Runtime, build-tool, dependency, or package-script changes warrant a current-commit run on the minimum supported major and the primary development major when practical.
- Documentation-only changes do not invalidate earlier runtime compatibility evidence. Run the current gate on the active development runtime and report the older matrix result as historical evidence.
- Never say a commit was tested on a Node version unless that exact commit was tested there. Say "previously tested" or "historical matrix evidence" when the run predates the commit.
- A passing check on Node 18.20.8 covers that patch release and tested working-tree state. It does not prove every `>=18` runtime, including Node 18.0, or establish the minimum Node version supported by development tooling.
- A passing historical matrix plus a current active-runtime gate can be enough for a patch release when intervening changes do not affect runtime compatibility. Record the reasoning instead of rerunning paid cloud jobs.
- GitHub Actions remains disabled. Local multi-version runs are preferred and must follow [`ci-policy.md`](./ci-policy.md).

## Evidence Register

| Evidence | Commit/scope | Environment | Result | Interpretation |
| --- | --- | --- | --- | --- |
| [Historical GitHub Actions run 25773955431](https://github.com/iWhatty/lightning-levenshtein/actions/runs/25773955431) | Pre-disable runtime and package work | GitHub-hosted Ubuntu; Node 18 and 24 matrix | Passed when observed | Historical compatibility evidence only; paid cloud CI is now disabled. |
| Local release gate, 2026-07-16 | Working tree that became `188f321` | Windows x64; Node 24.11.0; pnpm 10.33.1 | Passed: 77 tests in 9 suites plus codegen, builds, exports, declarations, tarball install, and exact pack checks | Current evidence for the release-positioning cleanup; it did not retest Node 18. |
| Local `0.0.6` release-preparation gate, 2026-07-16 | `0.0.6` release-preparation tree based on `188f321` | Windows x64; Node 24.11.0; pnpm 10.33.1 | Passed: 77 tests in 9 suites plus codegen, source/import checks, evidence promotion, four builds, exports, declarations, tarball install, and exact pack checks | Current package-state evidence. Historical Node 18/24 matrix evidence remains separately identified above. |
| [Compatibility readiness sprint, 2026-10-05](./compatibility-readiness-sprint.md) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 191-file non-documentation fingerprint `c2825b8f1c277a5fa5ceaa755ab205ff7a3d9d965154d772fbe8bfb5627e265b` unchanged | Windows x64, Intel i5-13600K; Node 18.20.8 / V8 10.2.154.26-node.39 / npm 10.8.2 and Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | Both `check:ci` runs exited 0: 22 suites, 185 tests, four builds, exact 45-file package check | Working-tree evidence for these two runtimes only. Existing dependencies reused; no fresh frozen-lockfile install. Not an exact-commit, every-Node-18-patch, or cross-platform claim. |
| [Fresh install readiness sprint, 2026-10-05](./fresh-install-readiness-sprint.md) | Copied dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; unchanged 223-file byte-manifest SHA-256 `8f1993e7ffad0611e9bdc44853d08507aebb5e6b5c4ac9876f4f5a8265f46673` | Windows x64, Intel i5-13600K; Node 24.11.0 / V8 13.6.233.10-node.28 / bundled npm 11.6.1; pnpm 10.33.1 | Fresh frozen-lockfile install exited 0 (0 reused, 326 downloaded); `check:ci` exited 0 with 22 suites, 185 tests, four builds, exact 45-file package; pack report exited 0; independent audit closed | Dirty-source copy without `.git`, not clean-commit evidence. Node 24 fresh-install evidence only; Node 18 fresh-install and other platforms remain pending. |
| [Patch group review, 2026-10-07](./release-delivery-map.md#review-progress) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 191-file non-documentation fingerprint `9416eb00ddd20f702b8d313481f15ba8d7224048af850c23167635d32d82ccbb` | Windows x64, Intel i5-13600K; Node 18.20.8 / V8 10.2.154.26-node.39 / npm 10.8.2 and Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | Both `check:ci` runs exited 0: 22 suites, 192 tests, four builds, packed-install and type consumers, exact 45-file package | Reused the existing development dependency tree. Working-tree evidence for these two runtimes, not an exact-commit, fresh-install, every-Node-18-patch, or cross-platform claim. |
| [Patch group review, later tree, 2026-10-07](./release-delivery-map.md#review-progress) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 192-file non-documentation fingerprint `45327b418bc814ab5d1aaed7c9a5195eafbe26e2ee716a190241e797cc23b8c7` | Windows x64, Intel i5-13600K; Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | `check:ci` exited 0: 23 suites, 205 tests, four builds, packed-install and type consumers, exact 45-file package; pack report exited 0 | Reused existing development dependencies. Later source/tooling changes were not rerun on Node 18; not exact-commit, fresh-install, or cross-platform evidence. |
| [Generated-output hardening, 2026-10-07](./codegen-output-hardening-task.md#evidence-and-limits) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; unchanged 193-file non-documentation fingerprint `896e92aa890562467c3112d9d34eaa3ab836d816809e769922a08f85dbb36b18` | Windows x64, Intel i5-13600K; process-isolated Node 18.20.8 / V8 10.2.154.26-node.39 / npm 10.8.2 and host Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | Both `check:ci` runs exited 0: 24 suites, 217 tests, four builds, packed-install and type consumers, exact 45-file package | Node 18 ZIP SHA-256 matched the official release value; PGP signature not independently verified. Existing development dependencies reused; portable runtime removed afterward. Dirty-tree evidence, not clean-commit, fresh-install, every-Node-18-patch, or cross-platform proof. |
| [Benchmark shortcut cleanup, 2026-10-13](./release-delivery-map.md#review-progress) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 193-file non-documentation fingerprint `061060d07081070701a0d7c1973867b036afbf888160370ba3870c091ef5dc01` | Windows x64, Intel i5-13600K; process-isolated Node 18.20.8 / V8 10.2.154.26-node.39 / npm 10.8.2 and host Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | Both `check:ci` runs exited 0: 24 suites, 217 tests, four builds, packed-install and type consumers, exact 45-file package; correctness-only package benchmark verification passed | Node 18 ZIP SHA-256 matched the previously recorded official release value; PGP signature not independently verified. Existing dependencies reused. Dirty-tree evidence only; not a clean commit, fresh install, every-Node-18-patch, or cross-platform result. |
| [Source import target check, 2026-10-13](./release-delivery-map.md#review-progress) | Dirty working tree based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`; 193-file non-documentation fingerprint `af76eeb7c280fc66e778e0b1ba8e0c8066ca68a101df6f5342a64f83c5cd17bb` | Windows x64, Intel i5-13600K; process-isolated Node 18.20.8 / V8 10.2.154.26-node.39 / npm 10.8.2 and host Node 24.11.0 / V8 13.6.233.10-node.28 / npm 11.6.1; pnpm 10.33.1 | Both `check:ci` runs exited 0: 24 suites, 218 tests, four builds, packed-install and type consumers, exact 45-file package | Verified Node 18 ZIP SHA-256 against previously recorded official value; PGP signature not independently verified. Existing dependencies reused; portable runtime removed after testing. Dirty-tree evidence only, not a clean commit, fresh install, every-Node-18-patch, or cross-platform result. |

Add future release-relevant runs here or in a version-specific release record. Preserve exact versions and commit identifiers so the statement remains auditable.

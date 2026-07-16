# Node-Version Testing

`package.json` declares Node.js `>=18`. That is the package compatibility contract, not a claim that every supported major is retested on every commit. Node 18 is now upstream end-of-life, while Node 22 and Node 24 are LTS releases; see the [Node.js release table](https://nodejs.org/en/about/previous-releases). The project may continue testing compatibility with an end-of-life minimum independently of upstream maintenance status.

## Canonical Gate

On every machine and Node version being qualified, record the commit and runtime first, then run the same release gate:

```bash
git rev-parse HEAD
node --version
node -p "process.versions.v8"
pnpm --version
pnpm install --frozen-lockfile
pnpm run check:ci
```

On Windows PowerShell, use `pnpm.cmd` if script execution policy blocks the `pnpm` shim. Record the operating system, architecture, CPU, command result, and whether the working tree was clean. Do not pool benchmark measurements across Node versions, operating systems, or CPUs.

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

This does not require uninstalling the existing Node installation, but `pnpm env use --global` changes the active pnpm-managed Node version systemwide. It is not a per-command sandbox. When changing the host-wide active version is undesirable, use a maintainer-provided Windows, WSL/Linux, or macOS machine, or an isolated version-manager/container environment, and run the same canonical gate there.

## Evidence Policy

- Runtime, build-tool, dependency, or package-script changes warrant a current-commit run on the minimum supported major and the primary development major when practical.
- Documentation-only changes do not invalidate earlier runtime compatibility evidence. Run the current gate on the active development runtime and report the older matrix result as historical evidence.
- Never say a commit was tested on a Node version unless that exact commit was tested there. Say "previously tested" or "historical matrix evidence" when the run predates the commit.
- A passing historical matrix plus a current active-runtime gate can be enough for a patch release when intervening changes do not affect runtime compatibility. Record the reasoning instead of rerunning paid cloud jobs.
- GitHub Actions remains disabled. Local multi-version runs are preferred and must follow [`ci-policy.md`](./ci-policy.md).

## Evidence Register

| Evidence | Commit/scope | Environment | Result | Interpretation |
| --- | --- | --- | --- | --- |
| [Historical GitHub Actions run 25773955431](https://github.com/iWhatty/lightning-levenshtein/actions/runs/25773955431) | Pre-disable runtime and package work | GitHub-hosted Ubuntu; Node 18 and 24 matrix | Passed when observed | Historical compatibility evidence only; paid cloud CI is now disabled. |
| Local release gate, 2026-07-16 | Working tree that became `188f321` | Windows x64; Node 24.11.0; pnpm 10.33.1 | Passed: 77 tests in 9 suites plus codegen, builds, exports, declarations, tarball install, and exact pack checks | Current evidence for the release-positioning cleanup; it did not retest Node 18. |
| Local `0.0.6` release-preparation gate, 2026-07-16 | `0.0.6` release-preparation tree based on `188f321` | Windows x64; Node 24.11.0; pnpm 10.33.1 | Passed: 77 tests in 9 suites plus codegen, source/import checks, evidence promotion, four builds, exports, declarations, tarball install, and exact pack checks | Current package-state evidence. Historical Node 18/24 matrix evidence remains separately identified above. |

Add future release-relevant runs here or in a version-specific release record. Preserve exact versions and commit identifiers so the statement remains auditable.

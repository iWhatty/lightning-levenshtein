# CI Policy

GitHub Actions is disabled because it consumes paid cloud compute without enough value for this repository's current workflow. The retained workflow is named `.github/workflows/ci.yml.disabled`, which GitHub does not execute.

Do not rename, dispatch, or otherwise re-enable the workflow unless the maintainer explicitly authorizes cloud CI again. This policy does not change automatically when billing quotas reset.

## Local Release Gate

Run the complete gate on the active development machine:

```bash
pnpm run check:ci
```

On Windows systems where PowerShell blocks package-manager shims, use:

```powershell
pnpm.cmd run check:ci
```

The gate checks code generation, repository source/import integrity, benchmark evidence promotion, all production bundles, Jest behavior, public exports, declarations, packed-tarball installation, and the exact publish file list.

## Cross-Platform Checks

When Linux, macOS, WSL, another CPU family, or another supported Node major matters, ask the maintainer to run the same local gate on an available machine. Record the OS, architecture, CPU, Node, V8, pnpm version, commit, and command result in the relevant release or benchmark evidence. See [`node-version-testing.md`](./node-version-testing.md) for the version-switching procedure and evidence rules.

Node 18 remains the documented minimum and Node 24 is the current development target. Exercise both locally when a release or compatibility-sensitive change warrants it; documentation-only changes do not automatically invalidate earlier runtime evidence. Do not start paid GitHub runners merely to reproduce checks already available on local hardware.

## Scope

Local CI is a correctness and package-shape gate, not a benchmark laboratory or byte-for-byte minifier auditor. Qualification benchmarks follow their own quiet-host protocol and remain outside `check:ci`.

Do not re-add tracked bundle byte-diff checks unless the Closure build becomes deterministic across operating systems and toolchain behavior. Sorted Closure input enumeration should remain because it reduces avoidable nondeterminism even though cross-platform minified bytes may still differ without a behavior change.

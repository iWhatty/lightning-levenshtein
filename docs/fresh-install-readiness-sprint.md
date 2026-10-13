# Fresh Install Readiness Sprint

Status: completed on 2026-10-05. Local fresh install and release gate passed; independent audit closed. This record covers a copied dirty working tree, not a clean commit or a release.

## Source and Environment

The source was the dirty checkout based on `a70f0b84cad82455162bef6c7dda8cbec25abd55`, still declaring package version `0.0.6`. A NUL-delimited Git manifest selected 223 unique tracked and untracked, non-ignored files. Those files were copied byte-for-byte into task-local temporary storage. The copy omitted `.git`, `node_modules`, and ignored files. No symlinks were present; the copier rejects them. A byte-manifest SHA-256 over the 223 file names and contents was `8f1993e7ffad0611e9bdc44853d08507aebb5e6b5c4ac9876f4f5a8265f46673` before and after validation. The original checkout's matching 223-file manifest was also unchanged after the run. This document and later documentation edits were created after the snapshot and are not among those 223 files.

The run used Windows `10.0.19045` x64, Intel Core i5-13600K, Node `24.11.0`, V8 `13.6.233.10-node.28`, pnpm `10.33.1`, and bundled npm `11.6.1`. Before and after the run, `package.json` SHA-256 was `debd587dc91cbe58746818fda79c92b58c5634e765dc83486d67879fc4524955`; `pnpm-lock.yaml` SHA-256 was `093867eef47f3f841ba966cfe31e4efab8e81d6376b796591be3f0206b996036`.

## Snapshot Fingerprint Recipe

Run this JavaScript with `node --input-type=module` on standard input from the repository root. Pass the preserved copy directory as the first argument after `-` to verify copied bytes. Git provides the NUL-delimited file list from the original checkout; the copy itself has no `.git`. The file list is deduplicated, checked for Git's relative POSIX path form, sorted, and limited to the original 223 files. Each file is hashed as raw bytes. The final SHA-256 hashes `JSON.stringify` of `[path, fileHash]` rows. The explicit exclusion accounts for this record being added after the snapshot.

```javascript
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sha256 = value => createHash("sha256").update(value).digest("hex");
const copyRoot = process.argv[2] ?? ".";
const paths = [...new Set(execFileSync("git", [
  "ls-files", "--cached", "--others", "--exclude-standard", "-z"
], { encoding: "utf8" }).split("\0").filter(Boolean))]
  .filter(path => path !== "docs/fresh-install-readiness-sprint.md")
  .sort();
if (paths.length !== 223 || paths.some(path => path.includes("\\"))) {
  throw new Error("snapshot manifest differs from the 223 relative POSIX paths");
}
const rows = paths.map(path => [path, sha256(readFileSync(join(copyRoot, path)))]);
console.log({ files: rows.length, sha256: sha256(JSON.stringify(rows)) });
```

The recipe was executed against the copied work before cleanup and returned 223 files and SHA-256 `8f1993e7ffad0611e9bdc44853d08507aebb5e6b5c4ac9876f4f5a8265f46673`. Running it against the current checkout may differ because existing documentation was edited after the snapshot. Any later file addition besides this record also changes the manifest and requires the original captured file list for exact reproduction.

## Validation Results

In the copied work, `pnpm install --frozen-lockfile --store-dir <new task-local store>` exited 0 with 0 packages reused and 326 downloaded. npm cache and user configuration were process-local and temporary. The lockfile was not rewritten.

The copied work's `check:ci` exited 0. It passed code generation drift, source checks (148 JavaScript files, 200 relative imports), documentation (20 files, 67 local links), repository policy, and unchanged legacy benchmark promotion checks. All four bundles built. Jest passed 22 suites and 185 tests. Runtime exports, workspace TypeScript consumers, packed-install runtime and type consumers, and the exact 45-file package check passed.

After this record was added, the original checkout's `test:docs` separately passed with 21 Markdown files, 72 local links, and three source-backed documents. That later result is not part of the copied `check:ci` result above.

`test:package:pack:report` also exited 0. The npm dry run listed 45 files, 55,972 packed bytes, and 309,991 unpacked bytes. No package was published.

## Evidence Limits and Next Step

This proves a fresh frozen-lockfile dependency install and local gate for this copied source state on Node 24 and Windows x64. The copy had no `.git`; it does not establish a clean-commit result. The [compatibility readiness run](./compatibility-readiness-sprint.md) passed Node 18.20.8 and Node 24.11.0 gates while reusing existing development dependencies. This fresh install does not turn the Node 18 result into fresh-install evidence. It also does not establish Node 18.0, other platforms, or all `>=18` versions.

An independent audit verified the copied package and lockfile hashes, confirmed the gate does not require the omitted `.git` directory, and found no material isolation defect. Its two evidence-record findings were closed: the fingerprint recipe is explicit and the new document passed a separate documentation check. The install used temporary cache/config paths, but shared the host OS, network, and Node/pnpm executables; it was not a hermetic build. After audit, the exact task-created copy, pnpm store, and npm cache were removed. No cloud CI, timed benchmark qualification, public benchmark change, tag, push, release, or npm publish was part of this run. Review the [release delivery map](./release-delivery-map.md) before any patch split; validate the assembled clean commit separately.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { EXPECTED_PACKAGE_FILES, PACKAGE_METADATA } from "./package-contract.mjs";
import { assertPackageMetadata } from "./package-metadata-contract.mjs";
import { runNpm } from "./run-npm.mjs";

const npm = "npm";
const tempDir = mkdtempSync(join(tmpdir(), "lightning-levenshtein-pack-dry-"));
const cacheDir = join(tempDir, "npm-cache");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const report = process.argv.includes("--report");

try {
  assertPackageMetadata({
    pkg,
    metadata: PACKAGE_METADATA,
  });

  const stdout = runNpm([
    "pack",
    "--dry-run",
    "--json",
    "--cache",
    cacheDir,
    "--pack-destination",
    tempDir
  ], { encoding: "utf8" });

  const [pack] = JSON.parse(stdout);
  assert.equal(pack.name, PACKAGE_METADATA.name);
  assert.equal(pack.version, pkg.version);

  const actualFiles = pack.files.map((file) => file.path).sort();
  assert.deepEqual(actualFiles, EXPECTED_PACKAGE_FILES);

  console.log(
    `package pack dry-run check passed (${pack.name}@${pack.version}, ${actualFiles.length} files, ${formatBytes(pack.size)} packed, ${formatBytes(pack.unpackedSize)} unpacked)`
  );

  if (report) {
    console.log(
      JSON.stringify(
        {
          name: pack.name,
          version: pack.version,
          filename: pack.filename,
          packedBytes: pack.size,
          unpackedBytes: pack.unpackedSize,
          shasum: pack.shasum,
          integrity: pack.integrity,
          files: pack.files.map(({ path, size }) => ({ path, size }))
        },
        null,
        2
      )
    );
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { assertPackageDeclarations } from "./package-declaration-contract.mjs";
import { PACKAGE_METADATA, PUBLIC_EXPORTS } from "./package-contract.mjs";
import { assertPackageMetadata } from "./package-metadata-contract.mjs";
import { runNpm } from "./run-npm.mjs";
import { runTypeScriptProject } from "./typescript-smoke.mjs";

const node = process.execPath;
const tempDir = mkdtempSync(join(tmpdir(), "lightning-levenshtein-pack-"));
const cacheDir = join(tempDir, "npm-cache");
const expectedPkg = JSON.parse(readFileSync("package.json", "utf8"));

try {
  runNpm(
    ["pack", "--silent", "--cache", cacheDir, "--pack-destination", tempDir],
    { cwd: process.cwd() }
  );

  const tarball = readdirSync(tempDir).find((file) => file.endsWith(".tgz"));
  assert.ok(tarball, "npm pack did not create a tarball");

  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2)
  );

  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--cache",
      cacheDir,
      join(tempDir, tarball)
    ],
    { cwd: tempDir }
  );

  const installedRoot = resolve(
    tempDir,
    "node_modules",
    PACKAGE_METADATA.name
  );
  const installedPkg = JSON.parse(
    readFileSync(join(installedRoot, "package.json"), "utf8")
  );

  assertPackageMetadata({
    pkg: installedPkg,
    metadata: PACKAGE_METADATA,
    version: expectedPkg.version,
  });
  assertPackageDeclarations({
    packageRoot: installedRoot,
    pkg: installedPkg,
    publicExports: PUBLIC_EXPORTS,
  });

  copyFileSync(
    resolve("scripts/package-runtime-contract.mjs"),
    join(tempDir, "package-runtime-contract.mjs")
  );

  writeFileSync(
    join(tempDir, "smoke.mjs"),
    `
import { assertPackageRuntime } from "./package-runtime-contract.mjs";
const publicExports = ${JSON.stringify(PUBLIC_EXPORTS.map(({ subpath, specifier, names }) => ({
  subpath,
  specifier,
  names,
})))};
await assertPackageRuntime(publicExports);
`.trimStart()
  );

  execFileSync(node, ["smoke.mjs"], {
    cwd: tempDir,
    stdio: "pipe"
  });

  mkdirSync(join(tempDir, "test", "fixtures"), { recursive: true });
  for (const fixture of [
    "package-types-consumer.ts",
    "package-types-consumer-negative.ts",
  ]) {
    copyFileSync(
      resolve("test", "fixtures", fixture),
      join(tempDir, "test", "fixtures", fixture)
    );
  }
  copyFileSync(
    resolve("tsconfig.package-smoke.json"),
    join(tempDir, "tsconfig.package-smoke.json")
  );

  runTypeScriptProject({
    cwd: tempDir,
    project: "tsconfig.package-smoke.json",
    label: "Packed-install TypeScript compilation",
  });

  console.log("packed tarball install smoke check passed");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

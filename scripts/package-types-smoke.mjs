import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { assertPackageDeclarations } from "./package-declaration-contract.mjs";
import { PUBLIC_EXPORTS } from "./package-contract.mjs";
import { runTypeScriptProject } from "./typescript-smoke.mjs";

const packageRoot = resolve(".");
const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));

assert.equal(pkg.types, pkg.exports["."].types);

assertPackageDeclarations({
  packageRoot,
  pkg,
  publicExports: PUBLIC_EXPORTS,
});

runTypeScriptProject({
  cwd: process.cwd(),
  project: "tsconfig.package-smoke.json",
  label: "TypeScript consumer compilation",
});
console.log("package declaration and TypeScript consumer smoke check passed");

import assert from "node:assert/strict";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { parseDeclaration } from "./declaration-contract.mjs";

export function assertPackageExportConditions({ pkg, publicExports }) {
  assert.deepEqual(
    Object.keys(pkg?.exports ?? {}).sort(),
    publicExports.map(({ subpath }) => subpath).sort(),
    "package export subpaths drift"
  );

  for (const { subpath, manifest } of publicExports) {
    const entry = pkg.exports[subpath];
    assert.ok(entry, `${subpath} declaration export missing`);
    assert.deepEqual(
      Object.keys(entry),
      Object.keys(manifest),
      `${subpath} export condition order drift`
    );
    assert.deepEqual(entry, manifest, `${subpath} declaration manifest drift`);
  }
}

export function assertPackageDeclarations({ packageRoot, pkg, publicExports }) {
  const root = resolve(packageRoot);
  const physicalRoot = realpathSync.native(root);
  assertPackageExportConditions({ pkg, publicExports });

  for (const { subpath, names, typeNames, manifest } of publicExports) {
    if (typeof manifest?.types !== "string") {
      throw new Error(`${subpath} declaration types target invalid`);
    }

    const typePath = resolve(root, manifest.types);
    const packageRelativePath = relative(root, typePath);
    if (!isContainedPath(packageRelativePath)) {
      throw new Error(
        `${subpath} declaration path escapes package root: ${manifest.types}`
      );
    }

    const packageFilePath = packageRelativePath.split(sep).join("/");
    if (!existsSync(typePath)) {
      throw new Error(`${subpath} declaration file missing: ${manifest.types}`);
    }
    const physicalTypePath = realpathSync.native(typePath);
    if (!isContainedPath(relative(physicalRoot, physicalTypePath))) {
      throw new Error(
        `${subpath} declaration path escapes package root through filesystem links: ${manifest.types}`
      );
    }
    if (!Array.isArray(pkg?.files) || !pkg.files.includes(packageFilePath)) {
      throw new Error(
        `${subpath} declaration file not listed in package files: ${packageFilePath}`
      );
    }

    let source;
    try {
      source = readFileSync(typePath, "utf8");
    } catch (error) {
      throw new Error(`${subpath} declaration read failed: ${manifest.types}`, {
        cause: error,
      });
    }

    let declaration;
    try {
      declaration = parseDeclaration(source, typePath);
    } catch (error) {
      throw new Error(`${subpath} declaration parse failed: ${error.message}`, {
        cause: error,
      });
    }

    assert.deepEqual(
      [...declaration.valueNames].sort(),
      [...names].sort(),
      `${subpath} declaration value exports drift`
    );
    assert.deepEqual(
      [...declaration.typeNames].sort(),
      [...typeNames].sort(),
      `${subpath} declaration type-only exports drift`
    );
  }
}

function isContainedPath(relativePath) {
  return relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath);
}

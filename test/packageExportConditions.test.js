import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { PUBLIC_EXPORTS } from "../scripts/package-contract.mjs";
import { assertPackageExportConditions } from "../scripts/package-declaration-contract.mjs";

const workspacePackage = JSON.parse(readFileSync("package.json", "utf8"));

describe("ordered package export conditions", () => {
  test("accepts all eight workspace export manifests", () => {
    expect(() => assertPackageExportConditions({
      pkg: workspacePackage,
      publicExports: PUBLIC_EXPORTS,
    })).not.toThrow();
  });

  test.each(PUBLIC_EXPORTS.map(({ subpath }) => [subpath]))(
    "%s rejects default before types or import without changing targets",
    (subpath) => {
      const entry = workspacePackage.exports[subpath];
      const reordered = entry.import
        ? { types: entry.types, default: entry.default, import: entry.import }
        : { default: entry.default, types: entry.types };
      const pkg = {
        ...workspacePackage,
        exports: { ...workspacePackage.exports, [subpath]: reordered },
      };

      expect(() => assertPackageExportConditions({
        pkg,
        publicExports: PUBLIC_EXPORTS,
      })).toThrow(`${subpath} export condition order drift`);
    }
  );

  test("Node resolves source and explicit min subpaths by ordered conditions", () => {
    const root = mkdtempSync(join(tmpdir(), "lightning export conditions "));
    const packageRoot = join(root, "node_modules", workspacePackage.name);
    const exports = Object.fromEntries(
      PUBLIC_EXPORTS.map(({ subpath, manifest }) => [subpath, manifest])
    );

    try {
      mkdirSync(packageRoot, { recursive: true });
      writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
        name: workspacePackage.name,
        type: "module",
        exports,
      }));

      for (const { manifest } of PUBLIC_EXPORTS) {
        for (const target of [manifest.import, manifest.default].filter(Boolean)) {
          const file = join(packageRoot, target);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, `export const resolvedTarget = ${JSON.stringify(target)};\n`);
        }
      }

      const consumer = join(root, "consumer.mjs");
      writeFileSync(consumer, `
        const specifiers = ${JSON.stringify(PUBLIC_EXPORTS.map(({ specifier }) => specifier))};
        console.log(JSON.stringify(await Promise.all(
          specifiers.map(async (specifier) => (await import(specifier)).resolvedTarget)
        )));
      `);
      const resolveTargets = () => JSON.parse(execFileSync(process.execPath, [consumer], {
        cwd: root,
        encoding: "utf8",
      }));

      expect(resolveTargets()).toEqual(PUBLIC_EXPORTS.map(
        ({ manifest }) => manifest.import ?? manifest.default
      ));

      exports["."] = { default: exports["."].default, ...exports["."] };
      writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
        name: workspacePackage.name,
        type: "module",
        exports,
      }));
      expect(resolveTargets()[0]).toBe(exports["."].default);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

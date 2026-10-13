import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { collectRelativeImports, hasExactPathCase } from "../scripts/source-invariants.mjs";

const root = resolve(".");

describe("source invariants", () => {
  test("collects static imports and exports despite intervening comments", () => {
    const source = [
      'import /* note */ "./side-effect.js";',
      'import { value } /* note */ from "../module.js";',
      'export * /* note */ from "./exported.js";',
      'export { value } from "./named.js";',
      'import "external-package";'
    ].join("\n");

    expect(collectRelativeImports(source, "sample.mjs")).toEqual([
      "./side-effect.js",
      "../module.js",
      "./exported.js",
      "./named.js"
    ]);
  });

  test("collects literal dynamic imports and requires, but ignores text", () => {
    const source = [
      'import /* note */ ("./dynamic.js");',
      'import(("./wrapped.js"));',
      'require /* note */ ("../common.cjs");',
      'require(`./template.cjs`);',
      '// import "./commented-out.js";',
      'const text = "require(\\\"./inside-string.js\\\")";',
      'const template = `import "./inside-template.js"`;',
      'import(variable);'
    ].join("\n");

    expect(collectRelativeImports(source, "sample.cjs")).toEqual([
      "./dynamic.js",
      "./wrapped.js",
      "../common.cjs",
      "./template.cjs"
    ]);
  });

  test("recognizes exact repository path casing", () => {
    expect(hasExactPathCase(root, resolve("src/distance.js"))).toBe(true);
    expect(hasExactPathCase(root, resolve("SRC/distance.js"))).toBe(false);
    expect(hasExactPathCase(root, resolve("src/Distance.js"))).toBe(false);
    expect(
      hasExactPathCase(
        root,
        resolve(dirname(root), basename(root).toUpperCase(), "src/distance.js")
      )
    ).toBe(false);
  });

  test("rejects paths outside the repository", () => {
    expect(hasExactPathCase(root, resolve("..", "outside.js"))).toBe(false);
  });

  test("source smoke rejects a relative import pointing at a directory", () => {
    const fixture = mkdtempSync(join(tmpdir(), "lightning-source-import-"));
    try {
      mkdirSync(join(fixture, "folder"));
      writeFileSync(join(fixture, "entry.mjs"), 'import "./folder";\n');

      const result = spawnSync(
        process.execPath,
        [resolve(root, "scripts/source-smoke.mjs")],
        { cwd: fixture, encoding: "utf8" }
      );

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("entry.mjs: relative import is not a file ./folder");
    } finally {
      const actual = realpathSync(fixture);
      if (dirname(actual) !== realpathSync(tmpdir()) ||
          !basename(actual).startsWith("lightning-source-import-")) {
        throw new Error(`Unexpected test cleanup directory: ${actual}`);
      }
      rmSync(actual, { recursive: true });
    }
  });
});

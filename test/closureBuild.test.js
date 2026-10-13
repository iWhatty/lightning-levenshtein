import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertExternExports,
  assertClosureBuildPaths,
  assertExportNames,
  assertRequiredBuildFile,
  buildClosureBundle,
  closureCompilerArguments,
  closureStagingFile,
  copyFileAtomically,
  replaceFileAtomically,
  rewriteClosureExports,
  selectClosureInputNames,
} from "../scripts/closure-build.mjs";

describe("Closure build path validation", () => {
  const baseConfig = {
    entryFile: "C:\\repo\\src\\index.js",
    temporaryEntryFile: "C:\\repo\\src\\index_temp.js",
    outputFile: "C:\\repo\\dist\\bundle.js",
    copies: ["C:\\repo\\dist\\copy.js"],
  };

  test.each([
    ["temporary entry and entry", { temporaryEntryFile: baseConfig.entryFile }, /temporary entry file collides with entryFile/],
    ["temporary entry and output", { temporaryEntryFile: baseConfig.outputFile }, /temporary entry file collides with outputFile/],
    ["temporary entry and copy", { temporaryEntryFile: baseConfig.copies[0] }, /temporary entry file collides with copies\[0\]/],
    ["temporary entry and output staging", { temporaryEntryFile: closureStagingFile(baseConfig.outputFile) }, /temporary entry file collides with outputFile staging/],
    ["temporary entry and copy staging", { temporaryEntryFile: closureStagingFile(baseConfig.copies[0]) }, /temporary entry file collides with copies\[0\] staging/],
    ["output and copy", { outputFile: baseConfig.copies[0] }, /output file collides with copy target/],
    ["duplicate copies", { copies: [baseConfig.copies[0], "C:\\REPO\\DIST\\COPY.JS"] }, /Duplicate Closure copy target/],
    ["entry and output", { outputFile: baseConfig.entryFile }, /entry file collides with outputFile/],
  ])("rejects %s", (_name, overrides, expected) => {
    expect(() => assertClosureBuildPaths({ ...baseConfig, ...overrides })).toThrow(expected);
  });

  test("compares Windows paths without case sensitivity", () => {
    expect(() => assertClosureBuildPaths({
      ...baseConfig,
      temporaryEntryFile: "c:\\REPO\\SRC\\INDEX.JS",
    })).toThrow(/temporary entry file collides with entryFile/);
  });

  test("accepts distinct canonical paths", () => {
    expect(() => assertClosureBuildPaths(baseConfig)).not.toThrow();
  });

  test("rejects before build filesystem mutation", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const sourceDirectory = join(directory, "src");
    const entryFile = join(sourceDirectory, "index.js");
    const outputFile = join(directory, "new", "bundle.js");

    try {
      mkdirSync(sourceDirectory, { recursive: true });
      writeFileSync(entryFile, "export const distance = () => 0;\n");

      expect(() => buildClosureBundle({
        label: "collision test",
        sourceDirectory,
        entryFile,
        temporaryEntryFile: entryFile,
        outputFile,
        exportNames: ["distance"],
        includeExterns: false,
      })).toThrow(/temporary entry file collides with entryFile/);

      expect(readFileSync(entryFile, "utf8")).toBe("export const distance = () => 0;\n");
      expect(existsSync(join(directory, "new"))).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("Closure bundle rewriting", () => {
  test("requires tracked build configuration instead of recreating it", () => {
    expect(() => assertRequiredBuildFile(
      resolve("test/fixtures/missing-externs.js"),
      "Closure externs file",
    )).toThrow("Closure externs file is missing:");
  });

  test("requires an extern declaration for every configured public export", () => {
    expect(() => assertExternExports(
      "function distance(a, b) {}",
      ["distance", "closest"],
    )).toThrow("Closure externs missing public exports: closest");

    expect(() => assertExternExports(
      "function distance(a, b) {}\nfunction closest(str, arr) {}",
      ["distance", "closest"],
    )).not.toThrow();
  });

  test.each([
    ["line comment", "// function createDistance(options) {}"],
    ["block comment", "/* function createDistance(options) {} */"],
    ["string literal", "const example = 'function createDistance(options) {}';"],
    ["nested declaration", "function wrapper() { function createDistance(options) {} }"],
  ])("does not count %s as an extern declaration", (_label, externs) => {
    expect(() => assertExternExports(externs, ["createDistance"]))
      .toThrow("Closure externs missing public exports: createDistance");
  });

  test("rejects malformed externs instead of accepting an apparent declaration", () => {
    expect(() => assertExternExports(
      "function createDistance(options) {}\nfunction broken(",
      ["createDistance"],
    )).toThrow("Closure externs contain invalid JavaScript:");
  });

  test("rejects missing externs before creating build files", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-externs-"));
    const sourceDirectory = join(directory, "src");
    const entryFile = join(sourceDirectory, "index.js");
    const temporaryEntryFile = join(sourceDirectory, "index_temp.js");
    const outputDirectory = join(directory, "new");

    try {
      mkdirSync(sourceDirectory);
      writeFileSync(entryFile, "export const neverDeclared = () => 0;\n");

      expect(() => buildClosureBundle({
        label: "extern preflight test",
        sourceDirectory,
        entryFile,
        temporaryEntryFile,
        outputFile: join(outputDirectory, "bundle.js"),
        exportNames: ["neverDeclared"],
      })).toThrow("Closure externs missing public exports: neverDeclared");

      expect(existsSync(temporaryEntryFile)).toBe(false);
      expect(existsSync(outputDirectory)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("rejects empty, unsafe, and duplicate public export configuration", () => {
    expect(() => assertExportNames([])).toThrow("at least one public export name");
    expect(() => assertExportNames(["distance;globalThis.injected=true"])).toThrow(
      "Invalid Closure public export name"
    );
    expect(() => assertExportNames(["distance", "distance"])).toThrow(
      "Duplicate Closure public export name: distance"
    );
    expect(() => assertExportNames(["distance", "$closest"])).not.toThrow();
  });

  test("recovers dot and bracket global exports as ESM", () => {
    const closureCode = [
      "var a=1,b=2;",
      '"undefined"!==typeof globalThis&&(globalThis.distance=a,globalThis["closest"]=b);',
    ].join("");

    const rewritten = rewriteClosureExports(closureCode, ["distance", "closest"]);

    expect(rewritten).toBe('"use strict";\nvar a=1,b=2;\nexport {a as distance, b as closest};\n');
  });

  test("recovers public export names containing dollar signs", () => {
    const closureCode = [
      "var a=1,b=2;",
      '"undefined"!==typeof globalThis&&(globalThis["$closest"]=a,globalThis.closest$=b);',
    ].join("");

    expect(rewriteClosureExports(closureCode, ["$closest", "closest$"])).toBe(
      '"use strict";\nvar a=1,b=2;\nexport {a as $closest, b as closest$};\n'
    );
  });

  test("preserves an existing strict directive", () => {
    const closureCode = '"use strict";var a=1;typeof globalThis!=="undefined"&&(globalThis.x=a);';
    const rewritten = rewriteClosureExports(closureCode, ["x"]);

    expect(rewritten.match(/"use strict"/g)).toHaveLength(1);
    expect(rewritten).toContain("export {a as x};");
  });

  test("rejects missing preserved globals", () => {
    expect(() => rewriteClosureExports("var a=1;", ["distance"]))
      .toThrow("Closure output did not preserve global export: distance");
  });

  test("includes only the current generated entry file", () => {
    expect(selectClosureInputNames([
      "distance.js",
      "index.js",
      "index_temp.js",
      "profiles_temp.js",
      "README.md",
      "unicode_temp.js",
    ], "index_temp.js")).toEqual([
      "distance.js",
      "index.js",
      "index_temp.js",
    ]);
  });

  test("passes paths with spaces and shell metacharacters as atomic arguments", () => {
    const source = "C:\\repo & tools\\src\\index.js";
    const output = "C:\\repo & tools\\dist\\bundle.js";
    const args = closureCompilerArguments({
      sourceFiles: [source],
      entryFile: source,
      outputFile: output,
      externsFile: "C:\\repo & tools\\externs.js",
    });

    expect(args).toContain(`--js=${source}`);
    expect(args).toContain(`--entry_point=${source}`);
    expect(args).toContain(`--js_output_file=${output}`);
    expect(args.some((argument) => argument.includes('"'))).toBe(false);
  });

  test("stages compiler output beside the published bundle", () => {
    expect(closureStagingFile("C:\\repo\\dist\\bundle.js")).toBe(
      "C:\\repo\\dist\\bundle.js.closure-temp"
    );
  });

  test("atomically replaces the published bundle from staging", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const outputFile = join(directory, "bundle.js");
    const stagingFile = closureStagingFile(outputFile);

    try {
      writeFileSync(outputFile, "old bundle");
      writeFileSync(stagingFile, "new bundle");

      replaceFileAtomically(stagingFile, outputFile);

      expect(readFileSync(outputFile, "utf8")).toBe("new bundle");
      expect(existsSync(stagingFile)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("atomically replaces secondary copies from staging", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const outputFile = join(directory, "bundle.js");
    const copyFile = join(directory, "copies", "bundle.js");
    const stagingFile = closureStagingFile(copyFile);

    try {
      mkdirSync(join(directory, "copies"), { recursive: true });
      writeFileSync(outputFile, "new bundle");
      writeFileSync(copyFile, "old bundle");

      copyFileAtomically(outputFile, copyFile);

      expect(readFileSync(copyFile, "utf8")).toBe("new bundle");
      expect(existsSync(stagingFile)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("preserves secondary copy target when source is unavailable", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const outputFile = join(directory, "missing.js");
    const copyFile = join(directory, "bundle.js");
    const stagingFile = closureStagingFile(copyFile);

    try {
      writeFileSync(copyFile, "old bundle");
      writeFileSync(stagingFile, "stale staging");

      expect(() => copyFileAtomically(outputFile, copyFile)).toThrow();

      expect(readFileSync(copyFile, "utf8")).toBe("old bundle");
      expect(existsSync(stagingFile)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("preserves secondary copy target when replacement is unavailable", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const outputFile = join(directory, "bundle.js");
    const copyFile = join(directory, "copy.js");
    const stagingFile = closureStagingFile(copyFile);

    try {
      writeFileSync(outputFile, "new bundle");
      mkdirSync(copyFile);
      writeFileSync(join(copyFile, "sentinel"), "keep target");

      expect(() => copyFileAtomically(outputFile, copyFile)).toThrow();

      expect(readFileSync(join(copyFile, "sentinel"), "utf8")).toBe("keep target");
      expect(existsSync(stagingFile)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("preserves the published bundle when staging is unavailable", () => {
    const directory = mkdtempSync(join(tmpdir(), "lightning-closure-build-"));
    const outputFile = join(directory, "bundle.js");
    const stagingFile = closureStagingFile(outputFile);

    try {
      writeFileSync(outputFile, "old bundle");

      expect(() => replaceFileAtomically(stagingFile, outputFile)).toThrow();

      expect(readFileSync(outputFile, "utf8")).toBe("old bundle");
      expect(existsSync(stagingFile)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

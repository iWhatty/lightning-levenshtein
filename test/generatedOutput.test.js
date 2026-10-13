import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { jest } from "@jest/globals";

const require = createRequire(import.meta.url);
const { writeOrCheckGeneratedOutputs } = require("../codegen/tools/generated-output.cjs");

let directory;
let first;
let second;

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "generated-output-"));
  first = path.join(directory, "comparison.js");
  second = path.join(directory, "production.js");
  fs.writeFileSync(first, "old comparison");
  fs.writeFileSync(second, "old production");
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(directory, { recursive: true, force: true });
  process.exitCode = undefined;
});

test.each([1, 2])("partial staging write %s preserves both old outputs", (failureAt) => {
  const original = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = (target, contents, options) => {
    if (typeof target === "number" && ++writes === failureAt) {
      original(target, "partial", options);
      throw new Error("simulated ENOSPC");
    }
    return original(target, contents, options);
  };
  try {
    expect(() => refresh([first, second])).toThrow("simulated ENOSPC");
  } finally {
    fs.writeFileSync = original;
  }
  expectOldPair();
  expectNoOwnedFiles();
  expect(console.log).not.toHaveBeenCalled();
});

test("failed second publication rolls first output back", () => {
  const original = fs.renameSync;
  let renames = 0;
  fs.renameSync = (from, to) => {
    if (++renames === 2) throw new Error("simulated second rename failure");
    return original(from, to);
  };
  try {
    expect(() => refresh([first, second])).toThrow("simulated second rename failure");
  } finally {
    fs.renameSync = original;
  }
  expectOldPair();
  expectNoOwnedFiles();
  expect(console.log).not.toHaveBeenCalled();
});

test("backup failure leaves both outputs untouched", () => {
  const original = fs.writeFileSync;
  let writes = 0;
  fs.writeFileSync = (target, contents, options) => {
    if (typeof target === "number" && ++writes === 4) {
      original(target, "partial backup", options);
      throw new Error("simulated backup failure");
    }
    return original(target, contents, options);
  };
  try {
    expect(() => refresh([first, second])).toThrow("simulated backup failure");
  } finally {
    fs.writeFileSync = original;
  }
  expectOldPair();
  expectNoOwnedFiles();
});

test.each([
  ["codegen-temp", 2],
  ["codegen-backup", 2],
])("existing %s sentinel survives exclusive-create failure", (suffix, failureAt) => {
  const original = fs.openSync;
  let opens = 0;
  let sentinel;
  fs.openSync = (file, flags, mode) => {
    if (typeof file === "string" && file.endsWith(`.${suffix}`) && ++opens === failureAt) {
      sentinel = file;
      const descriptor = original(file, "wx");
      try {
        fs.writeFileSync(descriptor, "unowned sentinel");
      } finally {
        fs.closeSync(descriptor);
      }
    }
    return original(file, flags, mode);
  };
  try {
    expect(() => refresh([first, second])).toThrow(/EEXIST/);
  } finally {
    fs.openSync = original;
  }
  expectOldPair();
  expect(fs.readFileSync(sentinel, "utf8")).toBe("unowned sentinel");
  expect(fs.readdirSync(directory).filter((name) =>
    name.endsWith(".codegen-temp") || name.endsWith(".codegen-backup")
  )).toEqual([path.basename(sentinel)]);
  expect(console.log).not.toHaveBeenCalled();
});

test("failed second publication leaves previously missing target absent", () => {
  fs.unlinkSync(first);
  const original = fs.renameSync;
  let renames = 0;
  fs.renameSync = (from, to) => {
    if (++renames === 2) throw new Error("simulated second rename failure");
    return original(from, to);
  };
  try {
    expect(() => refresh([first, second])).toThrow("simulated second rename failure");
  } finally {
    fs.renameSync = original;
  }
  expect(fs.existsSync(first)).toBe(false);
  expect(fs.readFileSync(second, "utf8")).toBe("old production");
  expectNoOwnedFiles();
});

test("failed rollback preserves recovery copy and reports its path", () => {
  const original = fs.renameSync;
  let renames = 0;
  fs.renameSync = (from, to) => {
    if (++renames >= 2) throw new Error("simulated rename failure");
    return original(from, to);
  };
  let failure;
  try {
    refresh([first, second]);
  } catch (error) {
    failure = error;
  } finally {
    fs.renameSync = original;
  }
  expect(failure).toBeInstanceOf(AggregateError);
  expect(fs.readFileSync(first, "utf8")).toBe("new output\n");
  expect(fs.readFileSync(second, "utf8")).toBe("old production");
  const backups = fs.readdirSync(directory).filter((name) => name.endsWith(".codegen-backup"));
  expect(backups).toHaveLength(1);
  const recovery = path.join(directory, backups[0]);
  expect(failure.message).toContain(recovery);
  expect(fs.readFileSync(recovery, "utf8")).toBe("old comparison");
  expect(fs.readdirSync(directory).filter((name) => name.endsWith(".codegen-temp"))).toEqual([]);
  expect(console.log).not.toHaveBeenCalled();
});

test("duplicate and hard-linked output aliases fail before mutation", () => {
  expect(() => refresh([first, path.join(directory, "nested", "..", "comparison.js")]))
    .toThrow("paths alias");
  const hardlink = path.join(directory, "same-file.js");
  fs.linkSync(first, hardlink);
  expect(() => refresh([first, hardlink])).toThrow("paths alias");
  expectOldPair();
  expectNoOwnedFiles();
});

test("symlinked output ancestor fails before mutation", () => {
  const outside = path.join(directory, "outside");
  const alias = path.join(directory, "alias");
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, alias, process.platform === "win32" ? "junction" : "dir");
  expect(() => refresh([first, path.join(alias, "escaped.js")])).toThrow("uses a symlink");
  expectOldPair();
  expectNoOwnedFiles();
  expect(fs.existsSync(path.join(outside, "escaped.js"))).toBe(false);
});

test("check normalizes CRLF without changing files or creating temporaries", () => {
  fs.writeFileSync(first, "new output\r\n");
  fs.writeFileSync(second, "new output\r\n");
  const before = fs.readFileSync(first);
  refresh([first, second], true);
  expect(process.exitCode).toBeUndefined();
  expect(fs.readFileSync(first)).toEqual(before);
  expectNoOwnedFiles();

  fs.writeFileSync(second, "stale\r\n");
  refresh([first, second], true);
  expect(process.exitCode).toBe(1);
  expect(fs.readFileSync(second, "utf8")).toBe("stale\r\n");
  expectNoOwnedFiles();
});

test("two-output and one-output refresh publish exact bytes without leftovers", () => {
  refresh([first, second]);
  expect(fs.readFileSync(first, "utf8")).toBe("new output\n");
  expect(fs.readFileSync(second, "utf8")).toBe("new output\n");
  expectNoOwnedFiles();
  expect(console.log).toHaveBeenCalledTimes(2);

  refresh([first]);
  expect(fs.readFileSync(first, "utf8")).toBe("new output\n");
  expectNoOwnedFiles();
  expect(console.log).toHaveBeenCalledTimes(3);
});

function refresh(outputPaths, check = false) {
  writeOrCheckGeneratedOutputs({
    generated: "new output\n",
    outputPaths,
    label: "test",
    refreshCommand: "pnpm run codegen:test",
    check,
  });
}

function expectOldPair() {
  expect(fs.readFileSync(first, "utf8")).toBe("old comparison");
  expect(fs.readFileSync(second, "utf8")).toBe("old production");
}

function expectNoOwnedFiles() {
  expect(fs.readdirSync(directory).filter((name) =>
    name.endsWith(".codegen-temp") || name.endsWith(".codegen-backup")
  )).toEqual([]);
}

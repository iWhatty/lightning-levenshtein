import fs from "fs";
import os from "os";
import path from "path";

import { writeEvidenceExclusive, writeEvidenceReplace } from "../bench/evidence-files.js";

let directory;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "benchmark-atomic-"));
});

afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true });
});

test("exclusive write failure removes partial temp and leaves destination absent", () => {
  const destination = path.join(directory, "run.json");
  withPartialWriteFailure(() => {
    expect(() => writeEvidenceExclusive(destination, "complete evidence"))
      .toThrow("simulated ENOSPC");
  });
  expect(fs.existsSync(destination)).toBe(false);
  expect(fs.readdirSync(directory)).toEqual([]);
});

test("exclusive publication refuses existing destination and removes temp", () => {
  const destination = path.join(directory, "run.json");
  fs.writeFileSync(destination, "original");
  expect(() => writeEvidenceExclusive(destination, "replacement")).toThrow();
  expect(fs.readFileSync(destination, "utf8")).toBe("original");
  expect(fs.readdirSync(directory)).toEqual(["run.json"]);
});

test.each(["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EPERM"])(
  "exclusive publication explains %s and removes temp",
  (code) => {
    const destination = path.join(directory, "run.json");
    const original = fs.linkSync;
    const cause = Object.assign(new Error("simulated link failure"), { code });
    fs.linkSync = () => { throw cause; };
    let failure;
    try {
      writeEvidenceExclusive(destination, "complete evidence");
    } catch (error) {
      failure = error;
    } finally {
      fs.linkSync = original;
    }
    expect(failure.message).toContain("requires hard-link support and write permission");
    expect(failure.code).toBe(code);
    expect(failure.cause).toBe(cause);
    expect(fs.existsSync(destination)).toBe(false);
    expect(fs.readdirSync(directory)).toEqual([]);
  }
);

test("replacement write failure preserves existing manifest", () => {
  const destination = path.join(directory, "promotion.json");
  fs.writeFileSync(destination, "original manifest");
  withPartialWriteFailure(() => {
    expect(() => writeEvidenceReplace(destination, "new manifest"))
      .toThrow("simulated ENOSPC");
  });
  expect(fs.readFileSync(destination, "utf8")).toBe("original manifest");
  expect(fs.readdirSync(directory)).toEqual(["promotion.json"]);
});

test("replacement publishes complete manifest and removes temp", () => {
  const destination = path.join(directory, "promotion.json");
  fs.writeFileSync(destination, "original manifest");
  writeEvidenceReplace(destination, "new manifest");
  expect(fs.readFileSync(destination, "utf8")).toBe("new manifest");
  expect(fs.readdirSync(directory)).toEqual(["promotion.json"]);
});

test("failed replacement publication preserves old manifest and removes temp", () => {
  const destination = path.join(directory, "promotion.json");
  fs.writeFileSync(destination, "original manifest");
  const original = fs.renameSync;
  fs.renameSync = () => { throw new Error("simulated rename failure"); };
  try {
    expect(() => writeEvidenceReplace(destination, "new manifest"))
      .toThrow("simulated rename failure");
  } finally {
    fs.renameSync = original;
  }
  expect(fs.readFileSync(destination, "utf8")).toBe("original manifest");
  expect(fs.readdirSync(directory)).toEqual(["promotion.json"]);
});

function withPartialWriteFailure(check) {
  const original = fs.writeFileSync;
  fs.writeFileSync = (file, contents, options) => {
    if (typeof file === "number") {
      original(file, "partial", options);
      throw new Error("simulated ENOSPC");
    }
    return original(file, contents, options);
  };
  try {
    check();
  } finally {
    fs.writeFileSync = original;
  }
}

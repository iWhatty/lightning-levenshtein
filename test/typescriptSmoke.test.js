import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { runTypeScriptProject } from "../scripts/typescript-smoke.mjs";

const successCompiler = resolve("test/fixtures/typescript-smoke-success.mjs");
const failureCompiler = resolve("test/fixtures/typescript-smoke-failure.mjs");

describe("TypeScript smoke runner", () => {
  test("passes project arguments and consumer cwd without shell parsing", () => {
    const cwd = mkdtempSync(join(tmpdir(), "lightning-typescript-smoke-"));
    const project = join(cwd, "project with spaces & punctuation.json");

    try {
      writeFileSync(project, "{}\n");

      expect(runTypeScriptProject({
        cwd,
        project,
        label: "Focused TypeScript smoke",
        compilerPath: successCompiler,
      }).status).toBe(0);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("labels nonzero compiler exits", () => {
    expect(() => runTypeScriptProject({
      cwd: process.cwd(),
      project: "unused-project.json",
      label: "Focused TypeScript failure",
      compilerPath: failureCompiler,
    })).toThrow(
      "Focused TypeScript failure failed: TypeScript compiler exited with status 7"
    );
  });

  test("rethrows compiler spawn errors", () => {
    const cwd = mkdtempSync(join(tmpdir(), "lightning-typescript-spawn-"));
    rmSync(cwd, { recursive: true, force: true });

    expect(() => runTypeScriptProject({
      cwd,
      project: "unused-project.json",
      label: "Focused TypeScript spawn",
      compilerPath: successCompiler,
    })).toThrow(/ENOENT/);
  });
});

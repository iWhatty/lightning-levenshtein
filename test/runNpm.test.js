import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveNpmCli, runNpm } from "../scripts/run-npm.mjs";

const tempRoot = mkdtempSync(join(tmpdir(), "npm runner & 100% "));
const runnerUrl = pathToFileURL(resolve("scripts/run-npm.mjs")).href;

function createCli(packageRoot, name = "npm") {
  const cli = join(packageRoot, "bin", "npm-cli.js");
  mkdirSync(dirname(cli), { recursive: true });
  writeFileSync(join(packageRoot, "package.json"), JSON.stringify({
    name,
    bin: { npm: "bin/npm-cli.js" },
  }));
  writeFileSync(cli, "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n");
  return cli;
}

afterAll(() => {
  if (tempRoot.startsWith(tmpdir()) && tempRoot !== tmpdir()) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("runNpm", () => {
  test("runs installed npm through Node from direct invocation", () => {
    expect(resolveNpmCli()).toMatch(/npm-cli\.js$/);
    expect(runNpm(["--version"], { encoding: "utf8" }).trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("ignores pnpm npm_execpath when npm is installed", () => {
    const pnpmCli = createCli(join(tempRoot, "pnpm-disguise"), "pnpm");
    const prior = process.env.npm_execpath;
    process.env.npm_execpath = pnpmCli;
    try {
      expect(resolveNpmCli()).not.toBe(pnpmCli);
      expect(runNpm(["--version"], { encoding: "utf8" }).trim()).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      if (prior === undefined) delete process.env.npm_execpath;
      else process.env.npm_execpath = prior;
    }
  });

  test("keeps shell syntax literal in real subprocess and metacharacter cwd", () => {
    const cli = createCli(join(tempRoot, "fake npm"));
    const marker = join(tempRoot, "SHOULD-NOT-EXIST");
    const args = [
      "space value", "amp & value", "percent %PATH%", "quote \" value",
      "pipe | value", "semi ; value", "dollar $(echo hi)",
      `& node -e "require('fs').writeFileSync('${marker}', 'bad')"`,
    ];
    const code = `import { runNpm } from ${JSON.stringify(runnerUrl)}; process.stdout.write(runNpm(JSON.parse(process.argv[1]), { cwd: process.argv[2], encoding: "utf8" }));`;
    const output = execFileSync(process.execPath, [
      "--input-type=module", "-e", code, JSON.stringify(args), tempRoot,
    ], {
      encoding: "utf8",
      env: { ...process.env, npm_execpath: cli },
    });

    expect(JSON.parse(output)).toEqual(args);
    expect(existsSync(marker)).toBe(false);
  });

  test("uses verified npm_execpath, Node installation, then PATH shim layout", () => {
    const explicitCli = createCli(join(tempRoot, "explicit", "npm"));
    const nodeDirectory = join(tempRoot, "node-install");
    const nodeCli = createCli(join(nodeDirectory, "node_modules", "npm"));
    const pathDirectory = join(tempRoot, "path-install");
    const pathCli = createCli(join(pathDirectory, "node_modules", "npm"));
    const nodePath = join(nodeDirectory, "node.exe");
    const env = { Path: pathDirectory, npm_execpath: explicitCli };

    expect(resolveNpmCli({ env, nodePath, platform: "win32" })).toBe(explicitCli);
    expect(resolveNpmCli({ env: { Path: pathDirectory }, nodePath, platform: "win32" }))
      .toBe(nodeCli);
    expect(resolveNpmCli({
      env: { Path: pathDirectory }, nodePath: join(tempRoot, "no-node", "node.exe"), platform: "win32",
    })).toBe(pathCli);
  });

  test("rejects pnpm-only and missing npm installations", () => {
    const pnpmCli = createCli(join(tempRoot, "only-pnpm"), "pnpm");
    expect(() => resolveNpmCli({
      env: { PATH: join(tempRoot, "empty"), npm_execpath: pnpmCli },
      nodePath: join(tempRoot, "no-node", "node.exe"),
      platform: "win32",
    })).toThrow("npm CLI not found");
  });
});

import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const npm = "npm";
const tempDir = mkdtempSync(join(tmpdir(), "lightning-levenshtein-pack-dry-"));
const cacheDir = join(tempDir, "npm-cache");

const expectedFiles = [
  "LICENSE.md",
  "README.md",
  "bench/packages/mean-ops-loglog-chart.svg",
  "bench/packages/mean-rank-log-chart.svg",
  "bench/packages/relative-performance.svg",
  "bench/packages/relative-to-fastest-levenshtein.svg",
  "dist/lightning-levenshtein-unicode.min.d.ts",
  "dist/lightning-levenshtein-unicode.min.js",
  "dist/lightning-levenshtein-v2.min.d.ts",
  "dist/lightning-levenshtein-v2.min.js",
  "dist/lightning-levenshtein.min.d.ts",
  "dist/lightning-levenshtein.min.js",
  "package.json"
].sort();

try {
  const stdout = runNpm([
    "pack",
    "--dry-run",
    "--json",
    "--cache",
    cacheDir,
    "--pack-destination",
    tempDir
  ]);

  const [pack] = JSON.parse(stdout);
  assert.equal(pack.name, "lightning-levenshtein");
  assert.equal(pack.version, "0.0.2");

  const actualFiles = pack.files.map((file) => file.path).sort();
  assert.deepEqual(actualFiles, expectedFiles);

  console.log("package pack dry-run check passed");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function runNpm(args) {
  if (process.platform === "win32") {
    const command = [npm, ...args.map(quoteWindowsArg)].join(" ");
    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  }

  return execFileSync(npm, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function quoteWindowsArg(value) {
  if (!/[\s"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

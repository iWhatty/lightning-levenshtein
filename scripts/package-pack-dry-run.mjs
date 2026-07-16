import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const npm = "npm";
const tempDir = mkdtempSync(join(tmpdir(), "lightning-levenshtein-pack-dry-"));
const cacheDir = join(tempDir, "npm-cache");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const expectedFiles = [
  "ADDITIONAL_TERMS.md",
  "LICENSE",
  "README.md",
  "bench/packages/mean-ops-loglog-chart.svg",
  "bench/packages/mean-rank-log-chart.svg",
  "bench/packages/relative-performance.svg",
  "bench/packages/relative-to-fastest-levenshtein.svg",
  "dist/lightning-levenshtein-unicode.min.d.ts",
  "dist/lightning-levenshtein-unicode.min.js",
  "dist/lightning-levenshtein-profiles.min.d.ts",
  "dist/lightning-levenshtein-profiles.min.js",
  "dist/lightning-levenshtein-v2.min.d.ts",
  "dist/lightning-levenshtein-v2.min.js",
  "dist/lightning-levenshtein.min.d.ts",
  "dist/lightning-levenshtein.min.js",
  "docs/licensing-position.md",
  "package.json",
  "robots.txt",
  "src/closest.js",
  "src/distance.js",
  "src/distanceMax.js",
  "src/distanceProfile.js",
  "src/distanceUnicode.js",
  "src/index.js",
  "src/myers_32.js",
  "src/myers_32_factory.js",
  "src/myers_32_max.js",
  "src/myers_32_unicode.js",
  "src/myers_x.js",
  "src/myers_x64.js",
  "src/myers_x64_factory.js",
  "src/myers_x_factory.js",
  "src/myers_x_max.js",
  "src/myers_x_unicode.js",
  "src/peq.js",
  "src/peqUnicode.js",
  "src/profiles.js",
  "src/unicode.js",
  "src/v2/index.js",
  "src/v2/myers32-unrolledA.js",
  "src/v2/myers_128.js",
  "src/v2/myers_256.js",
  "src/v2/myers_64.js",
  "src/v2/myers_96.js",
  "src/v2/myers_x128.js",
  "src/v2/myers_x64.js"
].sort();

try {
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.scripts.prepublishOnly, "pnpm run check:ci");
  assert.equal(pkg.license, "SEE LICENSE IN LICENSE");
  assert.equal(pkg.publishConfig?.access, "public");
  assert.equal(pkg.repository?.url, "git+https://github.com/iWhatty/lightning-levenshtein.git");

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
  assert.equal(pack.version, pkg.version);

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

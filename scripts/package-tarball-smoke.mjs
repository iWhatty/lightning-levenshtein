import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const npm = "npm";
const node = process.execPath;
const tempDir = mkdtempSync(join(tmpdir(), "lightning-levenshtein-pack-"));
const cacheDir = join(tempDir, "npm-cache");

try {
  runNpm(
    ["pack", "--silent", "--cache", cacheDir, "--pack-destination", tempDir],
    process.cwd()
  );

  const tarball = readdirSync(tempDir).find((file) => file.endsWith(".tgz"));
  assert.ok(tarball, "npm pack did not create a tarball");

  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify({ private: true, type: "module" }, null, 2)
  );

  runNpm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      "--cache",
      cacheDir,
      join(tempDir, tarball)
    ],
    tempDir
  );

  writeFileSync(
    join(tempDir, "smoke.mjs"),
    `
import assert from "node:assert/strict";
import * as root from "lightning-levenshtein";
import * as v2 from "lightning-levenshtein/v2";
import * as unicode from "lightning-levenshtein/unicode";

assert.deepEqual(Object.keys(root).sort(), ["closest", "distance", "distanceMax"]);
assert.deepEqual(Object.keys(v2).sort(), ["levenshteinLightning"]);
assert.deepEqual(Object.keys(unicode).sort(), ["distanceUnicode"]);

assert.equal(root.distance("kitten", "sitting"), 3);
assert.equal(root.distanceMax("kitten", "sitting", 10), 3);
assert.equal(root.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(v2.levenshteinLightning("kitten", "sitting"), 3);
assert.equal(root.distance("\\u4f60a", "\\u4f60b"), 2);
assert.equal(unicode.distanceUnicode("\\u4f60a", "\\u4f60b"), 1);
`.trimStart()
  );

  execFileSync(node, ["smoke.mjs"], {
    cwd: tempDir,
    stdio: "pipe"
  });

  console.log("packed tarball install smoke check passed");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

function runNpm(args, cwd) {
  if (process.platform === "win32") {
    const command = [npm, ...args.map(quoteWindowsArg)].join(" ");
    execSync(command, {
      cwd,
      stdio: "pipe"
    });
    return;
  }

  execFileSync(npm, args, {
    cwd,
    stdio: "pipe"
  });
}

function quoteWindowsArg(value) {
  if (!/[\s"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

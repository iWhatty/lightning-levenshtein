import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
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
const expectedPkg = JSON.parse(readFileSync("package.json", "utf8"));

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

  const installedPkg = JSON.parse(
    readFileSync(
      join(tempDir, "node_modules", "lightning-levenshtein", "package.json"),
      "utf8"
    )
  );

  assert.equal(installedPkg.name, "lightning-levenshtein");
  assert.equal(installedPkg.version, expectedPkg.version);
  assert.equal(installedPkg.type, "module");
  assert.equal(installedPkg.sideEffects, false);
  assert.equal(installedPkg.license, "SEE LICENSE IN LICENSE");
  assert.equal(installedPkg.publishConfig?.access, "public");
  assert.equal(installedPkg.repository?.url, "git+https://github.com/iWhatty/lightning-levenshtein.git");
  assert.equal(installedPkg.engines?.node, ">=18");
  assert.equal(installedPkg.types, "./dist/lightning-levenshtein.min.d.ts");
  assert.equal(installedPkg.scripts.prepublishOnly, "pnpm run check:ci");
  assert.deepEqual(Object.keys(installedPkg.exports).sort(), [
    ".",
    "./min",
    "./profiles",
    "./profiles/min",
    "./unicode",
    "./unicode/min",
    "./v2",
    "./v2/min"
  ]);
  assert.equal(
    installedPkg.exports["."].types,
    "./dist/lightning-levenshtein.min.d.ts"
  );
  assert.equal(
    installedPkg.exports["./v2"].types,
    "./dist/lightning-levenshtein-v2.min.d.ts"
  );
  assert.equal(
    installedPkg.exports["./unicode"].types,
    "./dist/lightning-levenshtein-unicode.min.d.ts"
  );
  assert.equal(
    installedPkg.exports["./profiles"].types,
    "./dist/lightning-levenshtein-profiles.min.d.ts"
  );

  writeFileSync(
    join(tempDir, "smoke.mjs"),
    `
import assert from "node:assert/strict";
import * as root from "lightning-levenshtein";
import * as rootMin from "lightning-levenshtein/min";
import * as v2 from "lightning-levenshtein/v2";
import * as v2Min from "lightning-levenshtein/v2/min";
import * as unicode from "lightning-levenshtein/unicode";
import * as unicodeMin from "lightning-levenshtein/unicode/min";
import * as profiles from "lightning-levenshtein/profiles";
import * as profilesMin from "lightning-levenshtein/profiles/min";

assert.deepEqual(Object.keys(root).sort(), ["closest", "distance", "distanceMax"]);
assert.deepEqual(Object.keys(rootMin).sort(), Object.keys(root).sort());
assert.deepEqual(Object.keys(v2).sort(), ["levenshteinLightning"]);
assert.deepEqual(Object.keys(v2Min).sort(), Object.keys(v2).sort());
assert.deepEqual(Object.keys(unicode).sort(), ["distanceUnicode"]);
assert.deepEqual(Object.keys(unicodeMin).sort(), Object.keys(unicode).sort());
assert.deepEqual(Object.keys(profiles).sort(), ["createDistance"]);
assert.deepEqual(Object.keys(profilesMin).sort(), Object.keys(profiles).sort());

assert.equal(root.distance("kitten", "sitting"), 3);
assert.equal(rootMin.distance("kitten", "sitting"), 3);
assert.equal(root.distanceMax("kitten", "sitting", 10), 3);
assert.equal(rootMin.distanceMax("kitten", "sitting", 10), 3);
assert.equal(root.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(rootMin.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(v2.levenshteinLightning("kitten", "sitting"), 3);
assert.equal(v2Min.levenshteinLightning("kitten", "sitting"), 3);
assert.equal(root.distance("\\u4f60a", "\\u4f60b"), 2);
assert.equal(unicode.distanceUnicode("\\u4f60a", "\\u4f60b"), 1);
assert.equal(unicodeMin.distanceUnicode("\\u4f60a", "\\u4f60b"), 1);
const ascii = profiles.createDistance({ profile: "ascii" });
const asciiMin = profilesMin.createDistance({ profile: "ascii" });
const asciiMinUnchecked = profilesMin.createDistance({ profile: "ascii", outOfRange: "assume-valid" });
assert.equal(ascii("kitten", "sitting"), 3);
assert.equal(asciiMin("kitten", "sitting"), 3);
assert.equal(asciiMinUnchecked("kitten", "sitting"), 3);
assert.throws(() => ascii("a\\u0080", "a"), RangeError);
assert.throws(() => asciiMin("a\\u0080", "a\\u0080"), RangeError);
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

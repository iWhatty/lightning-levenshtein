// ./build-gcc.mjs
"use strict";

import {
  mkdirSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  existsSync
} from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

const srcDir = resolve("./src/");
const distDir = resolve("./dist/");

const entryFile = resolve(srcDir, "index.js");
const externsFile = resolve("./", "externs.js");

const closureFile = resolve(distDir, "lightning-levenshtein.min.js");
const tempWrappedFile = resolve(srcDir, "index_temp.js");

mkdirSync(distDir, { recursive: true });

// Ensure externs file exists
if (!existsSync(externsFile)) {
  writeFileSync(externsFile, "/** @externs */\n");
}

// Inject global exports safely so Closure preserves them
const base = readFileSync(entryFile, "utf8");
const globalExport = `
if (typeof globalThis !== 'undefined') {
  globalThis['distance'] = distance;
  globalThis['distanceMax'] = distanceMax;
  globalThis['closest'] = closest;
}
`;
writeFileSync(tempWrappedFile, base + globalExport);

const cmd = [
  "npx",
  "google-closure-compiler",
  `--js="${srcDir}/*.js"`,
  `--entry_point="${tempWrappedFile}"`,
  `--externs="${externsFile}"`,
  "--language_in=ECMASCRIPT_NEXT",
  "--language_out=ECMASCRIPT_NEXT",
  "--compilation_level=ADVANCED",
  "--assume_function_wrapper",
  "--warning_level=VERBOSE",
  `--js_output_file="${closureFile}"`,
  "--rewrite_polyfills=false",
  "--dependency_mode=PRUNE",
  "--module_resolution=NODE"
].join(" ");

console.log("Running Closure Compiler...");
try {
  execSync(cmd, { stdio: "pipe" });
} catch (err) {
  console.error("Closure Compiler failed:\n");
  console.error(err.stdout?.toString() || "");
  console.error(err.stderr?.toString() || "");
  throw err;
}

console.log("Rewriting preserved global exports to ESM export...");
const closureCode = readFileSync(closureFile, "utf8");

const exports = {
  distance: findGlobalExport(closureCode, "distance"),
  distanceMax: findGlobalExport(closureCode, "distanceMax"),
  closest: findGlobalExport(closureCode, "closest")
};

let fixedCode = stripGlobalExportBlock(closureCode);
fixedCode = addUseStrict(fixedCode);
fixedCode += `\nexport {${exports.distance} as distance, ${exports.distanceMax} as distanceMax, ${exports.closest} as closest};\n`;
assertExports(fixedCode, ["distance", "distanceMax", "closest"]);
writeFileSync(closureFile, fixedCode);

console.log(`Output written to: ${closureFile}`);

try {
  unlinkSync(tempWrappedFile);
  console.log("Cleaned up temporary file: index_temp.js");
} catch (err) {
  console.warn("Failed to remove temporary file:", err.message);
}

function addUseStrict(code) {
  const strictRegex = /^\s*["']use strict["'];?/;
  if (strictRegex.test(code)) return code;

  const shebangMatch = code.match(/^#!.*\n/);
  if (shebangMatch) {
    const [shebang] = shebangMatch;
    return shebang + `"use strict";\n` + code.slice(shebang.length);
  }

  return `"use strict";\n` + code;
}

function findGlobalExport(code, name) {
  const identifier = "([a-zA-Z_$][\\w$]*)";
  const dotPattern = new RegExp(`globalThis\\.${name}\\s*=\\s*${identifier}`);
  const bracketPattern = new RegExp(
    `globalThis\\[['"]${name}['"]\\]\\s*=\\s*${identifier}`
  );
  const match = code.match(dotPattern) || code.match(bracketPattern);
  if (!match) {
    throw new Error(`Closure output did not preserve global export: ${name}`);
  }
  return match[1];
}

function stripGlobalExportBlock(code) {
  return code.replace(
    /"undefined"!==typeof globalThis&&\([^;]*globalThis[^;]*\);?/g,
    ""
  );
}

function assertExports(code, names) {
  for (const name of names) {
    if (!new RegExp(`\\bas\\s+${name}\\b`).test(code)) {
      throw new Error(`Generated bundle is missing ESM export: ${name}`);
    }
  }
}

// ./build-gcc-unicode.mjs
"use strict";

import {
  mkdirSync,
  unlinkSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync
} from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

const srcDir = resolve("./src/");
const distDir = resolve("./dist/");

const entryFile = resolve(srcDir, "unicode.js");
const externsFile = resolve("./", "externs.js");
const closureCli = resolve("./node_modules/google-closure-compiler/cli.js");

const closureFile = resolve(distDir, "lightning-levenshtein-unicode.min.js");
const tempWrappedFile = resolve(srcDir, "unicode_temp.js");

mkdirSync(distDir, { recursive: true });

if (!existsSync(externsFile)) {
  writeFileSync(externsFile, "/** @externs */\n");
}

const base = readFileSync(entryFile, "utf8");
const globalExport = `
if (typeof globalThis !== 'undefined') {
  globalThis['distanceUnicode'] = distanceUnicode;
}
`;
writeFileSync(tempWrappedFile, base + globalExport);

const cmd = [
  `"${process.execPath}"`,
  `"${closureCli}"`,
  ...closureJsInputs(srcDir),
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

console.log("Running Closure Compiler for unicode...");
try {
  execSync(cmd, { stdio: "pipe" });
} catch (err) {
  console.error("Closure Compiler failed:\n");
  console.error(err.stdout?.toString() || "");
  console.error(err.stderr?.toString() || "");
  throw err;
}

console.log("Rewriting preserved unicode export to ESM export...");
const closureCode = readFileSync(closureFile, "utf8");

const exports = {
  distanceUnicode: findGlobalExport(closureCode, "distanceUnicode")
};

let fixedCode = stripGlobalExportBlock(closureCode);
fixedCode = addUseStrict(fixedCode);
fixedCode += `\nexport {${exports.distanceUnicode} as distanceUnicode};\n`;
assertExports(fixedCode, ["distanceUnicode"]);
writeFileSync(closureFile, fixedCode);

console.log(`Unicode output written to: ${closureFile}`);

try {
  unlinkSync(tempWrappedFile);
  console.log("Cleaned up temporary file: unicode_temp.js");
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
    /(?:"undefined"!==typeof globalThis|typeof globalThis!=="undefined")&&\([^;]*globalThis[^;]*\);?/g,
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

function closureJsInputs(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .map((file) => `--js="${resolve(dir, file)}"`);
}

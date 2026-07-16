// ./build-gcc-bolt.mjs
"use strict";

import {
  mkdirSync,
  unlinkSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  copyFileSync
} from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

// v2 source moved from bench/bolt/ → src/v2/ (0.0.5) so the `./v2` package
// export can route bundlers at raw ESM via the `import` condition rather
// than only the pre-built blob. See CHANGELOG 0.0.5 + npm-next.md for the
// rationale.
const srcDir = resolve("./src/v2/");
const benchDir = resolve("./bench/");
const distDir = resolve("./dist/");

const entryFile = resolve(srcDir, "index.js");
const externsFile = resolve("./", "externs.js");
const closureCli = resolve("./node_modules/google-closure-compiler/cli.js");

const benchOutputFile = resolve(benchDir, "lightning-levenshtein-v2.min.js");
const distOutputFile = resolve(distDir, "lightning-levenshtein-v2.min.js");
const tempWrappedFile = resolve(srcDir, "index_temp.js");

mkdirSync(benchDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

if (!existsSync(externsFile)) {
  writeFileSync(externsFile, "/** @externs */\n");
}

const base = readFileSync(entryFile, "utf8");
const globalExport = `
if (typeof globalThis !== 'undefined') {
  globalThis['levenshteinLightning'] = levenshteinLightning;
}
`;
writeFileSync(tempWrappedFile, base + globalExport);

const cmd = [
  `"${process.execPath}"`,
  `"${closureCli}"`,
  ...closureJsInputs(srcDir),
  `--entry_point="${tempWrappedFile}"`,
  "--language_in=ECMASCRIPT_NEXT",
  "--language_out=ECMASCRIPT_NEXT",
  "--compilation_level=ADVANCED",
  "--assume_function_wrapper",
  "--warning_level=VERBOSE",
  `--js_output_file="${benchOutputFile}"`,
  "--rewrite_polyfills=false",
  "--dependency_mode=PRUNE",
  "--module_resolution=NODE"
].join(" ");

console.log("Running Closure Compiler for v2...");
try {
  execSync(cmd, { stdio: "pipe" });
} catch (err) {
  console.error("Closure Compiler failed:\n");
  console.error(err.stdout?.toString() || "");
  console.error(err.stderr?.toString() || "");
  throw err;
}

console.log("Rewriting preserved global export to ESM export...");
const closureCode = readFileSync(benchOutputFile, "utf8");

const exports = {
  levenshteinLightning: findGlobalExport(closureCode, "levenshteinLightning")
};

let fixedCode = stripGlobalExportBlock(closureCode);
fixedCode = addUseStrict(fixedCode);
fixedCode += `\nexport {${exports.levenshteinLightning} as levenshteinLightning};\n`;
assertExports(fixedCode, ["levenshteinLightning"]);
writeFileSync(benchOutputFile, fixedCode);

console.log(`Primary v2 output written to: ${benchOutputFile}`);

copyFileSync(benchOutputFile, distOutputFile);
console.log(`Copied v2 output to: ${distOutputFile}`);

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

function closureJsInputs(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .map((file) => `--js="${resolve(dir, file)}"`);
}

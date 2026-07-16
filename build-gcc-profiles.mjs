"use strict";

import {
  mkdirSync,
  unlinkSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync
} from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const srcDir = resolve("./src/");
const distDir = resolve("./dist/");
const entryFile = resolve(srcDir, "profiles.js");
const externsFile = resolve("./externs.js");
const closureCli = resolve("./node_modules/google-closure-compiler/cli.js");
const closureFile = resolve(distDir, "lightning-levenshtein-profiles.min.js");
const tempWrappedFile = resolve(srcDir, "profiles_temp.js");

mkdirSync(distDir, { recursive: true });
if (!existsSync(externsFile)) writeFileSync(externsFile, "/** @externs */\n");

const base = readFileSync(entryFile, "utf8");
writeFileSync(
  tempWrappedFile,
  `${base}\nif (typeof globalThis !== "undefined") {\n  globalThis["createDistance"] = createDistance;\n}\n`
);

const command = [
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

console.log("Running Closure Compiler for profiles...");
try {
  execSync(command, { stdio: "pipe" });
} catch (error) {
  console.error("Closure Compiler failed:\n");
  console.error(error.stdout?.toString() || "");
  console.error(error.stderr?.toString() || "");
  throw error;
}

console.log("Rewriting preserved profiles export to ESM export...");
const closureCode = readFileSync(closureFile, "utf8");
const exportName = findGlobalExport(closureCode, "createDistance");
let fixedCode = stripGlobalExportBlock(closureCode);
fixedCode = addUseStrict(fixedCode);
fixedCode += `\nexport {${exportName} as createDistance};\n`;
assertExport(fixedCode, "createDistance");
writeFileSync(closureFile, fixedCode);

console.log(`Profiles output written to: ${closureFile}`);

try {
  unlinkSync(tempWrappedFile);
  console.log("Cleaned up temporary file: profiles_temp.js");
} catch (error) {
  console.warn("Failed to remove temporary file:", error.message);
}

function addUseStrict(code) {
  const strictRegex = /^\s*["']use strict["'];?/;
  if (strictRegex.test(code)) return code;
  return `"use strict";\n${code}`;
}

function findGlobalExport(code, name) {
  const identifier = "([a-zA-Z_$][\\w$]*)";
  const dotPattern = new RegExp(`globalThis\\.${name}\\s*=\\s*${identifier}`);
  const bracketPattern = new RegExp(
    `globalThis\\[['"]${name}['"]\\]\\s*=\\s*${identifier}`
  );
  const match = code.match(dotPattern) || code.match(bracketPattern);
  if (!match) throw new Error(`Closure output did not preserve global export: ${name}`);
  return match[1];
}

function stripGlobalExportBlock(code) {
  return code.replace(
    /(?:"undefined"!==typeof globalThis|typeof globalThis!=="undefined")&&\([^;]*globalThis[^;]*\);?/g,
    ""
  );
}

function assertExport(code, name) {
  if (!new RegExp(`\\bas\\s+${name}\\b`).test(code)) {
    throw new Error(`Generated bundle is missing ESM export: ${name}`);
  }
}

function closureJsInputs(directory) {
  return readdirSync(directory)
    .filter((file) => file.endsWith(".js"))
    .sort()
    .map((file) => `--js="${resolve(directory, file)}"`);
}

import { execFileSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve, win32 } from "node:path";
import ts from "typescript";

const EXTERNS_FILE = resolve("./externs.js");
const CLOSURE_CLI = resolve("./node_modules/google-closure-compiler/cli.js");

export function buildClosureBundle({
  label,
  sourceDirectory,
  entryFile,
  temporaryEntryFile,
  outputFile,
  exportNames,
  includeExterns = true,
  copies = [],
}) {
  assertClosureBuildPaths({ entryFile, temporaryEntryFile, outputFile, copies });
  assertRequiredBuildFile(entryFile, "Closure entry file");
  assertRequiredBuildFile(CLOSURE_CLI, "Closure compiler CLI");
  assertExportNames(exportNames);
  if (includeExterns) {
    assertRequiredBuildFile(EXTERNS_FILE, "Closure externs file");
    assertExternExports(readFileSync(EXTERNS_FILE, "utf8"), exportNames);
  }
  const source = readFileSync(entryFile, "utf8");
  const stagingOutputFile = closureStagingFile(outputFile);
  let ownsTemporaryEntry = false;
  let ownsStagingOutput = false;

  try {
    const entryDescriptor = openExclusiveBuildFile(temporaryEntryFile, "temporary entry");
    ownsTemporaryEntry = true;
    try {
      writeFileSync(entryDescriptor, `${source}${globalExportBlock(exportNames)}`);
    } finally {
      closeSync(entryDescriptor);
    }

    mkdirSync(dirname(outputFile), { recursive: true });
    for (const copy of copies) mkdirSync(dirname(copy), { recursive: true });

    const outputDescriptor = openExclusiveBuildFile(stagingOutputFile, "staging output");
    ownsStagingOutput = true;
    closeSync(outputDescriptor);

    console.log(`Running Closure Compiler for ${label}...`);
    runClosureCompiler({
      sourceDirectory,
      temporaryEntryFile,
      outputFile: stagingOutputFile,
      includeExterns,
    });

    const closureCode = readFileSync(stagingOutputFile, "utf8");
    const fixedCode = rewriteClosureExports(closureCode, exportNames);
    writeFileSync(stagingOutputFile, fixedCode);
    replaceFileAtomically(stagingOutputFile, outputFile);
    console.log(`Output written to: ${outputFile}`);

    for (const copy of copies) {
      copyFileAtomically(outputFile, copy);
      console.log(`Copied output to: ${copy}`);
    }
  } finally {
    if (ownsTemporaryEntry) {
      cleanupStagingFile(temporaryEntryFile);
      console.log(`Cleaned up temporary file: ${temporaryEntryFile}`);
    }
    if (ownsStagingOutput) cleanupStagingFile(stagingOutputFile);
  }
}

export function copyFileAtomically(sourceFile, outputFile) {
  const stagingFile = closureStagingFile(outputFile);
  let ownsStagingFile = false;

  try {
    const descriptor = openExclusiveBuildFile(stagingFile, "copy staging output");
    ownsStagingFile = true;
    closeSync(descriptor);
    copyFileSync(sourceFile, stagingFile);
    replaceFileAtomically(stagingFile, outputFile);
  } finally {
    if (ownsStagingFile) cleanupStagingFile(stagingFile);
  }
}

export function closureStagingFile(outputFile) {
  return `${outputFile}.closure-temp`;
}

export function assertClosureBuildPaths({
  entryFile,
  temporaryEntryFile,
  outputFile,
  copies = [],
}) {
  if (!Array.isArray(copies)) {
    throw new TypeError("Closure build copies must be an array");
  }

  const configuredFiles = [
    { label: "entryFile", path: entryFile },
    { label: "temporaryEntryFile", path: temporaryEntryFile },
    { label: "outputFile", path: outputFile },
    ...copies.map((path, index) => ({ label: `copies[${index}]`, path })),
  ];

  const stagingFiles = [
    { label: "outputFile staging", path: closureStagingFile(outputFile) },
    ...copies.map((path, index) => ({
      label: `copies[${index}] staging`,
      path: closureStagingFile(path),
    })),
  ];

  const seen = new Map();
  for (const file of [...configuredFiles, ...stagingFiles]) {
    const canonical = canonicalAbsolutePath(file.path, file.label);
    const previous = seen.get(canonical);
    if (previous) throwPathCollision(file, previous);
    seen.set(canonical, file);
  }
}

function canonicalAbsolutePath(file, label) {
  if (typeof file !== "string" || file.length === 0) {
    throw new TypeError(`Closure build ${label} must be a non-empty path string`);
  }

  const absolute = isWindowsPath(file) ? win32.resolve(file) : resolve(file);
  return process.platform === "win32" || isWindowsPath(file)
    ? absolute.toLowerCase()
    : absolute;
}

function isWindowsPath(file) {
  return /^(?:[A-Za-z]:|\\\\)/.test(file);
}

function throwPathCollision(current, previous) {
  const currentIsCopy = current.label.startsWith("copies[") && !current.label.endsWith(" staging");
  const previousIsCopy = previous.label.startsWith("copies[") && !previous.label.endsWith(" staging");

  if (currentIsCopy && previousIsCopy) {
    throw new Error(
      `Duplicate Closure copy target: ${current.path} aliases ${previous.label}`
    );
  }

  if (
    (current.label === "outputFile" && previousIsCopy)
    || (previous.label === "outputFile" && currentIsCopy)
  ) {
    throw new Error(
      `Closure output file collides with copy target: ${current.path} aliases ${previous.label}`
    );
  }

  if (current.label === "temporaryEntryFile" || previous.label === "temporaryEntryFile") {
    const temporary = current.label === "temporaryEntryFile" ? current : previous;
    const other = current.label === "temporaryEntryFile" ? previous : current;
    throw new Error(
      `Closure temporary entry file collides with ${other.label}: ${temporary.path}`
    );
  }

  if (current.label === "entryFile" || previous.label === "entryFile") {
    const entry = current.label === "entryFile" ? current : previous;
    const other = current.label === "entryFile" ? previous : current;
    throw new Error(`Closure entry file collides with ${other.label}: ${entry.path}`);
  }

  if (current.label.endsWith(" staging") || previous.label.endsWith(" staging")) {
    const staging = current.label.endsWith(" staging") ? current : previous;
    const other = current.label.endsWith(" staging") ? previous : current;
    throw new Error(
      `Closure path collides with derived staging output: ${staging.label} aliases ${other.label}`
    );
  }

  throw new Error(`Closure build path collision: ${current.label} aliases ${previous.label}`);
}

// Staging stays beside the published file, so rename is a same-filesystem
// replacement and never exposes a partially copied bundle.
export function replaceFileAtomically(stagingFile, outputFile) {
  renameSync(stagingFile, outputFile);
}

function openExclusiveBuildFile(file, label) {
  try {
    return openSync(file, "wx");
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(`Closure ${label} already exists; inspect before removing: ${file}`, { cause: error });
    }
    throw error;
  }
}

function cleanupStagingFile(stagingFile) {
  try {
    if (!lstatSync(stagingFile).isDirectory()) unlinkSync(stagingFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export function assertRequiredBuildFile(file, label) {
  if (!existsSync(file)) throw new Error(`${label} is missing: ${file}`);
}

export function assertExportNames(exportNames) {
  if (!Array.isArray(exportNames) || exportNames.length === 0) {
    throw new TypeError("Closure build requires at least one public export name");
  }

  const seen = new Set();
  for (const name of exportNames) {
    if (typeof name !== "string" || !/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new TypeError(`Invalid Closure public export name: ${String(name)}`);
    }
    if (seen.has(name)) throw new TypeError(`Duplicate Closure public export name: ${name}`);
    seen.add(name);
  }
}

export function assertExternExports(externs, exportNames) {
  const source = ts.createSourceFile(
    "externs.js",
    externs,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );
  if (source.parseDiagnostics.length > 0) {
    const diagnostic = source.parseDiagnostics[0];
    throw new Error(
      `Closure externs contain invalid JavaScript: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
    );
  }

  const declarations = new Set(
    source.statements
      .filter(ts.isFunctionDeclaration)
      .map((statement) => statement.name?.text)
      .filter((name) => name !== undefined)
  );
  const missing = exportNames.filter((name) => !declarations.has(name));
  if (missing.length > 0) {
    throw new Error(`Closure externs missing public exports: ${missing.join(", ")}`);
  }
}

export function rewriteClosureExports(code, exportNames) {
  const identifiers = exportNames.map((name) => [name, findGlobalExport(code, name)]);
  let fixedCode = stripGlobalExportBlock(code);
  fixedCode = addUseStrict(fixedCode);
  fixedCode += `\nexport {${identifiers.map(([name, identifier]) => `${identifier} as ${name}`).join(", ")}};\n`;
  assertExports(fixedCode, exportNames);
  return fixedCode;
}

function runClosureCompiler({ sourceDirectory, temporaryEntryFile, outputFile, includeExterns }) {
  const args = closureCompilerArguments({
    sourceFiles: closureJsFiles(sourceDirectory, temporaryEntryFile),
    entryFile: temporaryEntryFile,
    outputFile,
    externsFile: includeExterns ? EXTERNS_FILE : undefined,
  });

  try {
    execFileSync(process.execPath, args, { stdio: "pipe" });
  } catch (error) {
    console.error("Closure Compiler failed:\n");
    console.error(error.stdout?.toString() || "");
    console.error(error.stderr?.toString() || "");
    throw error;
  }
}

export function closureCompilerArguments({ sourceFiles, entryFile, outputFile, externsFile }) {
  return [
    CLOSURE_CLI,
    ...sourceFiles.map((file) => `--js=${file}`),
    `--entry_point=${entryFile}`,
    ...(externsFile ? [`--externs=${externsFile}`] : []),
    "--language_in=ECMASCRIPT_NEXT",
    "--language_out=ECMASCRIPT_NEXT",
    "--compilation_level=ADVANCED",
    "--assume_function_wrapper",
    "--warning_level=VERBOSE",
    `--js_output_file=${outputFile}`,
    "--rewrite_polyfills=false",
    "--dependency_mode=PRUNE",
    "--module_resolution=NODE",
  ];
}

function globalExportBlock(exportNames) {
  const assignments = exportNames
    .map((name) => `  globalThis['${name}'] = ${name};`)
    .join("\n");
  return `\nif (typeof globalThis !== 'undefined') {\n${assignments}\n}\n`;
}

function addUseStrict(code) {
  const strictPattern = /^\s*["']use strict["'];?/;
  if (strictPattern.test(code)) return code;

  const shebangMatch = code.match(/^#!.*\n/);
  if (shebangMatch) {
    const [shebang] = shebangMatch;
    return `${shebang}"use strict";\n${code.slice(shebang.length)}`;
  }

  return `"use strict";\n${code}`;
}

function findGlobalExport(code, name) {
  const identifier = "([a-zA-Z_$][\\w$]*)";
  const escapedName = escapeRegExp(name);
  const dotPattern = new RegExp(`globalThis\\.${escapedName}\\s*=\\s*${identifier}`);
  const bracketPattern = new RegExp(`globalThis\\[['"]${escapedName}['"]\\]\\s*=\\s*${identifier}`);
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

function assertExports(code, names) {
  for (const name of names) {
    if (!new RegExp(`\\bas\\s+${escapeRegExp(name)}(?![\\w$])`).test(code)) {
      throw new Error(`Generated bundle is missing ESM export: ${name}`);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function closureJsFiles(directory, temporaryEntryFile) {
  return selectClosureInputNames(readdirSync(directory), basename(temporaryEntryFile))
    .map((file) => resolve(directory, file));
}

export function selectClosureInputNames(fileNames, temporaryEntryName) {
  return [...new Set([
    ...fileNames.filter((file) => file.endsWith(".js") && !file.endsWith("_temp.js")),
    temporaryEntryName,
  ])].sort();
}

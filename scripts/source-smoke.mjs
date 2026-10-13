import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectRelativeImports, hasExactPathCase } from "./source-invariants.mjs";

const root = resolve(".");
const extensions = new Set([".js", ".mjs", ".cjs"]);
const ignoredDirectories = new Set([".git", "node_modules"]);

const files = collectJavaScriptFiles(root).sort();
const failures = [];
let relativeImportCount = 0;

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${relative(file)}: syntax check failed\n${error.stderr}`);
    continue;
  }

  const source = readFileSync(file, "utf8");
  for (const specifier of collectRelativeImports(source, file)) {
    relativeImportCount++;
    const target = fileURLToPath(new URL(specifier, pathToFileURL(file)));
    if (!existsSync(target)) {
      failures.push(`${relative(file)}: missing relative import ${specifier}`);
    } else if (!statSync(target).isFile()) {
      failures.push(`${relative(file)}: relative import is not a file ${specifier}`);
    } else if (!hasExactPathCase(root, target)) {
      failures.push(`${relative(file)}: relative import has incorrect path casing ${specifier}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `source smoke check passed (${files.length} files, ${relativeImportCount} relative imports)`
  );
}

function collectJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectJavaScriptFiles(resolve(directory, entry.name)));
      }
    } else if (extensions.has(extname(entry.name))) {
      files.push(resolve(directory, entry.name));
    }
  }

  return files;
}

function relative(file) {
  return file.slice(root.length + 1).replaceAll("\\", "/");
}

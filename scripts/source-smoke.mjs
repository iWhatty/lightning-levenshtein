import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(".");
const extensions = new Set([".js", ".mjs", ".cjs"]);
const ignoredDirectories = new Set([".git", "node_modules"]);
const importPatterns = [
  /\b(?:import|export)\s+(?:[^"';]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g,
  /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g
];

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
  for (const pattern of importPatterns) {
    for (const match of source.matchAll(pattern)) {
      relativeImportCount++;
      const target = fileURLToPath(new URL(match[1], pathToFileURL(file)));
      if (!existsSync(target)) {
        failures.push(`${relative(file)}: missing relative import ${match[1]}`);
      }
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

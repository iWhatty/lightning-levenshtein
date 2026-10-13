import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { stripArgumentSeparator, validateSafeName } from "./cli-arguments.js";
import { canonicalPath, isWithin, requireEvidenceDirectory, writeEvidenceExclusive } from "./evidence-files.js";
import { aggregateDiagnosticRuns } from "./diagnostics/aggregate.js";
import { aggregateRuns } from "./packages/aggregate.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinations = {
  packages: path.join(ROOT_DIR, "bench/packages/qualification/raw"),
  diagnostics: path.join(ROOT_DIR, "bench/diagnostics/results/raw"),
};

const args = stripArgumentSeparator(process.argv.slice(2));
const kindArgument = args.find((argument) => argument.startsWith("--kind="));
const inputPaths = args.filter((argument) => !argument.startsWith("--"));
const unknown = args.find((argument) => argument.startsWith("--") && argument !== kindArgument);
if (unknown) throw new Error(`unknown argument: ${unknown}`);
const kind = kindArgument?.slice(7);
if (!Object.hasOwn(destinations, kind) || inputPaths.length === 0) {
  throw new Error("Usage: node bench/import-runs.js --kind=packages|diagnostics <external-raw-run.json>...");
}

const canonicalRoot = canonicalPath(ROOT_DIR);
const seen = new Set();
const inputs = inputPaths.map((inputPath) => {
  const canonical = fs.realpathSync.native(path.resolve(inputPath));
  if (seen.has(canonical)) throw new Error(`duplicate raw input: ${inputPath}`);
  seen.add(canonical);
  if (isWithin(canonicalRoot, canonical)) throw new Error(`raw input must be outside repository: ${inputPath}`);
  if (!fs.statSync(canonical).isFile()) throw new Error(`raw input is not a file: ${inputPath}`);
  const contents = fs.readFileSync(canonical, "utf8");
  return { contents, run: JSON.parse(contents) };
});

if (kind === "packages") aggregateRuns(inputs.map(({ run }) => run));
else aggregateDiagnosticRuns(inputs.map(({ run }) => run));

const destinationDir = destinations[kind];
requireEvidenceDirectory(destinationDir, ROOT_DIR);
const outputs = inputs.map(({ run, contents }) => ({
  file: path.join(destinationDir, `${validateSafeName(run.meta.runId, "run id")}.json`),
  contents,
}));
for (const { file } of outputs) {
  if (fs.existsSync(file)) throw new Error(`raw destination already exists: ${file}`);
}

fs.mkdirSync(destinationDir, { recursive: true });
const created = [];
try {
  for (const { file, contents } of outputs) {
    writeEvidenceExclusive(file, contents);
    created.push(file);
  }
} catch (error) {
  for (const file of created) fs.unlinkSync(file);
  throw error;
}
for (const { file } of outputs) console.log(`Imported ${path.relative(ROOT_DIR, file).replaceAll("\\", "/")}`);

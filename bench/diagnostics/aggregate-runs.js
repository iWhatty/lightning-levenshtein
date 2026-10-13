import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { stripArgumentSeparator, validateSafeName } from "../cli-arguments.js";
import { requireEvidenceDirectory, requireFileWithin, writeEvidenceExclusive } from "../evidence-files.js";
import { aggregateDiagnosticRuns } from "./aggregate.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argumentsList = stripArgumentSeparator(process.argv.slice(2));
const setArgument = argumentsList.find((argument) => argument.startsWith("--set="));
const baselineArgument = argumentsList.find((argument) => argument.startsWith("--baseline="));
const inputFiles = argumentsList.filter((argument) => !argument.startsWith("--"));
const unknownArgument = argumentsList.find((argument) =>
  argument.startsWith("--") && !argument.startsWith("--set=") && !argument.startsWith("--baseline=")
);

if (unknownArgument) throw new Error(`unknown argument: ${unknownArgument}`);

if (!setArgument || inputFiles.length === 0) {
  throw new Error(
    "Usage: node bench/diagnostics/aggregate-runs.js --set=<name> [--baseline=<target>] <raw-run.json>..."
  );
}

const setName = validateSafeName(setArgument.slice(6), "set name");
const baseline = validateSafeName(baselineArgument?.slice(11) || "v2", "baseline");
const rawDir = path.join(ROOT_DIR, "bench/diagnostics/results/raw");
requireEvidenceDirectory(rawDir, ROOT_DIR);
const resolvedFiles = inputFiles.map((file) => requireFileWithin(file, rawDir, "diagnostic raw input"));
if (new Set(resolvedFiles).size !== resolvedFiles.length) throw new Error("duplicate diagnostic raw input path");
const runs = resolvedFiles.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const aggregate = aggregateDiagnosticRuns(runs, baseline);
aggregate.sourceFiles = resolvedFiles.map((file) =>
  path.relative(ROOT_DIR, file).replaceAll("\\", "/")
);

const outDir = path.join(ROOT_DIR, "bench/diagnostics/results/aggregates");
const outFile = path.join(outDir, `${setName}.json`);
requireEvidenceDirectory(outDir, ROOT_DIR);
fs.mkdirSync(outDir, { recursive: true });
writeEvidenceExclusive(outFile, `${JSON.stringify(aggregate, null, 2)}\n`);
console.log(`Wrote ${path.relative(ROOT_DIR, outFile)}`);

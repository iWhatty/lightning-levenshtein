import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { aggregateRuns } from "./aggregate.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argumentsList = process.argv.slice(2);
const setArgument = argumentsList.find((argument) => argument.startsWith("--set="));
const baselineArgument = argumentsList.find((argument) => argument.startsWith("--baseline="));
const inputFiles = argumentsList.filter((argument) => !argument.startsWith("--"));

if (!setArgument || inputFiles.length === 0) {
  throw new Error(
    "Usage: node bench/packages/aggregate-runs.js --set=<name> [--baseline=<target>] <raw-run.json>..."
  );
}

const setName = setArgument.slice(6);
if (!/^[A-Za-z0-9._-]+$/.test(setName)) throw new TypeError("set name contains unsafe characters");
const baseline = baselineArgument?.slice(11) || "fastest-levenshtein";
const runs = inputFiles.map((file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8")));
const aggregate = aggregateRuns(runs, baseline);
const outDir = path.join(ROOT_DIR, "bench/packages/qualification/aggregates");
const outFile = path.join(outDir, `${setName}.json`);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(ROOT_DIR, outFile)}`);

import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { balancedTargetOrder, checksumPairs, summarize, verifyTargets } from "../harness.js";
import { requireExternalOutputDirectory, writeEvidenceExclusive } from "../evidence-files.js";
import {
  parseIntegerListArgument,
  parseListArgument,
  parseNonNegativeIntegerArgument,
  parsePositiveIntegerArgument,
  stripArgumentSeparator,
  validateSafeName,
} from "../cli-arguments.js";
import { referenceDistance } from "../reference-distance.js";
import { buildWorkloadPairs, WORKLOAD_FAMILIES } from "../workloads.js";
import { targetsForDomain } from "./targets.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_LENGTHS = [
  1, 2, 3, 31, 32, 33, 63, 64, 65, 95, 96, 97,
  127, 128, 129, 223, 224, 225, 255, 256, 257, 511, 512, 513,
];
const DEFAULT_SEEDS = [1337, 7331, 20250321];
const options = parseArguments(stripArgumentSeparator(process.argv.slice(2)));
if (options.measure) options.outDir = requireExternalOutputDirectory(options.outDir, ROOT_DIR);
const command = { ...options };
delete command.outDir;
const results = {
  schemaVersion: 1,
  meta: {
    runId: options.runId ?? makeRunId(options.repetition),
    generatedAt: new Date().toISOString(),
    revision: readGitRevision(),
    mode: options.measure ? "measure" : "verify-only",
    command,
    families: Object.fromEntries(options.families.map((family) => [family, WORKLOAD_FAMILIES[family]])),
    runtime: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      release: os.release(),
      arch: process.arch,
      cpu: os.cpus()[0]?.model ?? "unknown",
      logicalCores: os.cpus().length,
    },
    protocol: {
      factoryConstruction: "all profile factories are bound at module initialization",
      targetOrder: "seeded Fisher-Yates permutation rotated by complete-suite repetition",
      warmup: `${options.warmRounds} complete dataset passes immediately before timing`,
      batching: "one complete dataset per timer check; final batch overrun retained",
      resultConsumption: "distance results accumulated into a timed checksum",
    },
  },
  results: {},
};

for (const family of options.families) {
  const definition = WORKLOAD_FAMILIES[family];
  const targets = targetsForDomain(definition.domain);
  results.results[family] = {};
  console.log(`\n=== ${family} (${definition.domain}) ===`);

  for (const length of options.lengths) {
    const targetSamples = Object.fromEntries(targets.map(([name]) => [name, []]));
    const seedResults = [];

    for (const seed of options.seeds) {
      const pairs = buildWorkloadPairs({ family, count: options.pairs, length, seed });
      const datasetChecksum = checksumPairs(pairs);
      const expectedDistanceChecksum = verifyTargets(referenceDistance, targets, pairs);
      const scheduleSeed = seed ^ length ^ stringHash(family);
      const order = balancedTargetOrder(targets, scheduleSeed, options.repetition);
      const seedResult = {
        seed,
        datasetChecksum,
        expectedDistanceChecksum,
        targetOrder: order.map(([name]) => name),
        measurements: {},
      };

      if (options.measure) {
        for (const [name, fn] of order) {
          warm(fn, pairs, options.warmRounds);
          const measurement = benchOne(fn, pairs, options.durationMs);
          seedResult.measurements[name] = measurement;
          targetSamples[name].push(measurement.opsPerMs);
        }
      }

      seedResults.push(seedResult);
      console.log(`N=${length} seed=${seed} data=${datasetChecksum} distances=${expectedDistanceChecksum}`);
    }

    results.results[family][length] = { seeds: seedResults };
    if (options.measure) {
      results.results[family][length].summary = Object.fromEntries(
        Object.entries(targetSamples).map(([name, samples]) => [name, summarize(samples)])
      );
    }
  }
}

if (!options.measure) {
  console.log("\nDiagnostic verification passed; no timing results were written.");
} else {
  fs.mkdirSync(options.outDir, { recursive: true });
  const outFile = path.join(options.outDir, `${results.meta.runId}.json`);
  writeEvidenceExclusive(outFile, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nWrote ${outFile}`);
}

function warm(fn, pairs, rounds) {
  let checksum = 0;
  for (let round = 0; round < rounds; round++) {
    for (const [a, b] of pairs) checksum = (checksum + fn(a, b)) >>> 0;
  }
  return checksum;
}

function benchOne(fn, pairs, durationMs) {
  let calls = 0;
  let timedChecksum = 0;
  const start = performance.now();
  let elapsed = 0;
  while (elapsed < durationMs) {
    for (const [a, b] of pairs) {
      timedChecksum = (timedChecksum + fn(a, b)) >>> 0;
      calls++;
    }
    elapsed = performance.now() - start;
  }
  return { calls, elapsed, opsPerMs: calls / elapsed, timedChecksum };
}

function parseArguments(args) {
  const parsed = {
    families: Object.keys(WORKLOAD_FAMILIES),
    lengths: DEFAULT_LENGTHS,
    seeds: DEFAULT_SEEDS,
    pairs: 24,
    durationMs: 200,
    warmRounds: 2,
    repetition: 0,
    measure: false,
    runId: null,
    outDir: null,
  };

  for (const argument of args) {
    if (argument === "--measure") parsed.measure = true;
    else if (argument.startsWith("--families=")) {
      parsed.families = parseListArgument(argument, "--families=");
      for (const family of parsed.families) {
        if (!WORKLOAD_FAMILIES[family]) throw new TypeError(`unknown workload family: ${family}`);
      }
    } else if (argument.startsWith("--lengths=")) parsed.lengths = parseIntegerListArgument(argument, "--lengths=");
    else if (argument.startsWith("--seeds=")) parsed.seeds = parseIntegerListArgument(argument, "--seeds=");
    else if (argument.startsWith("--pairs=")) parsed.pairs = parsePositiveIntegerArgument(argument, "--pairs=");
    else if (argument.startsWith("--duration-ms=")) parsed.durationMs = parsePositiveIntegerArgument(argument, "--duration-ms=");
    else if (argument.startsWith("--warm-rounds=")) parsed.warmRounds = parseNonNegativeIntegerArgument(argument, "--warm-rounds=");
    else if (argument.startsWith("--repetition=")) parsed.repetition = parseNonNegativeIntegerArgument(argument, "--repetition=");
    else if (argument.startsWith("--run-id=")) parsed.runId = validateSafeName(argument.slice(9), "run id");
    else if (argument.startsWith("--out-dir=")) parsed.outDir = argument.slice(10);
    else throw new Error(`unknown argument: ${argument}`);
  }
  return parsed;
}

function makeRunId(repetition) {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}_diagnostic_r${repetition}`;
}

function stringHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function readGitRevision() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT_DIR, encoding: "utf8" }).length > 0;
    return { commit, dirty };
  } catch {
    return { commit: "unknown", dirty: true };
  }
}

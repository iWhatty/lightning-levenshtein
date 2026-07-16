import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

import { buildPairs, mean, median } from "../data.js";
import { balancedTargetOrder, verifyTargets } from "../harness.js";
import { referenceDistance } from "../reference-distance.js";

import { distance as fastestLevenshtein } from "fastest-levenshtein";
import jsLevenshtein from "js-levenshtein";
import leven from "leven";
import { levenshteinEditDistance } from "levenshtein-edit-distance";

import { levenshteinLightning } from "../lightning-levenshtein-v2.min.js";
import { distance as levenshteinLightningV1 } from "../../dist/lightning-levenshtein.min.js";

const require = createRequire(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RAW_DIR = path.join(ROOT_DIR, "bench/packages/qualification/raw");
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8")
);

const DEFAULTS = {
  lengths: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
  seeds: [1337, 7331, 20250321],
  pairs: 500,
  durationMs: 500,
  warmRounds: 3,
  repetition: 0,
};
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TARGETS = [
  ["lightning-levenshtein-v2", levenshteinLightning],
  ["lightning-levenshtein-v1", levenshteinLightningV1],
  ["fastest-levenshtein", fastestLevenshtein],
  ["js-levenshtein", jsLevenshtein],
  ["leven", leven],
  ["levenshtein-edit-distance", levenshteinEditDistance],
];

const options = parseArguments(process.argv.slice(2));
const revision = readGitRevision();
const runId = options.runId ?? makeRunId(revision.commit, options.repetition);
const results = {
  schemaVersion: 2,
  meta: {
    runId,
    generatedAt: new Date().toISOString(),
    revision,
    packageVersion: PACKAGE_JSON.version,
    dependencyVersions: Object.fromEntries(
      TARGETS.slice(2).map(([name]) => [name, installedVersion(name)])
    ),
    command: {
      lengths: options.lengths,
      seeds: options.seeds,
      pairs: options.pairs,
      durationMs: options.durationMs,
      warmRounds: options.warmRounds,
      repetition: options.repetition,
      verifyOnly: options.verifyOnly,
    },
    alphabet: ALPHABET,
    workload: "random-equal-length-ascii",
    unit: "ops/sec",
    primaryMetric: "meanOpsPerMs",
    aggregation: "arithmetic mean across seeds within one complete-suite repetition",
    baseline: "fastest-levenshtein",
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
      targetOrder: "seeded Fisher-Yates permutation rotated by complete-suite repetition",
      warmup: `${options.warmRounds} full dataset passes per target immediately before timing`,
      batching: "one complete dataset per timer check",
      timerOverrun: "the final complete dataset batch is retained",
      resultConsumption: "distance results are accumulated into a timed checksum",
    },
  },
  results: {},
};

for (const length of options.lengths) {
  console.log(`\n=== N=${length} ===`);
  results.results[length] = Object.fromEntries(TARGETS.map(([name]) => [name, {
    seedRuns: [],
    meanOpsPerMs: 0,
    meanOpsPerSec: 0,
    medianOpsPerMs: 0,
    medianOpsPerSec: 0,
  }]));

  for (const seed of options.seeds) {
    const pairs = buildPairs({
      count: options.pairs,
      lenA: length,
      lenB: length,
      seed,
      alphabet: ALPHABET,
    });
    const verificationChecksum = verifyTargets(referenceDistance, TARGETS, pairs);
    const order = balancedTargetOrder(TARGETS, seed ^ length, options.repetition);
    console.log(`Seed ${seed} | verify ${verificationChecksum} | ${order.map(([name]) => name).join(" -> ")}`);

    if (options.verifyOnly) continue;

    for (const [name, fn] of order) {
      warm(fn, pairs, options.warmRounds);
      const run = benchOne(fn, pairs, options.durationMs);
      results.results[length][name].seedRuns.push({
        seed,
        orderPosition: order.findIndex(([targetName]) => targetName === name),
        verificationChecksum,
        ...run,
      });
      console.log(`${name.padEnd(28)} ${run.opsPerMs.toFixed(2).padStart(12)} ops/ms`);
    }
  }

  if (!options.verifyOnly) finalizeLength(results.results[length]);
}

if (options.verifyOnly) {
  console.log("\nVerification passed; no performance results were written.");
} else {
  fs.mkdirSync(options.outDir, { recursive: true });
  const outFile = path.join(options.outDir, `${runId}.json`);
  fs.writeFileSync(outFile, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${path.relative(ROOT_DIR, outFile)}`);
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
  return {
    calls,
    elapsed,
    opsPerMs: calls / elapsed,
    opsPerSec: (calls / elapsed) * 1000,
    timedChecksum,
  };
}

function finalizeLength(lengthResults) {
  for (const target of Object.values(lengthResults)) {
    const opsPerMs = target.seedRuns.map((run) => run.opsPerMs);
    const opsPerSec = target.seedRuns.map((run) => run.opsPerSec);
    target.meanOpsPerMs = mean(opsPerMs);
    target.meanOpsPerSec = mean(opsPerSec);
    target.medianOpsPerMs = median(opsPerMs);
    target.medianOpsPerSec = median(opsPerSec);
  }
}

function parseArguments(args) {
  const parsed = { ...DEFAULTS, outDir: RAW_DIR, verifyOnly: false, runId: null };
  for (const argument of args) {
    if (argument === "--verify-only") parsed.verifyOnly = true;
    else if (argument.startsWith("--lengths=")) parsed.lengths = integerList(argument, "--lengths=");
    else if (argument.startsWith("--seeds=")) parsed.seeds = integerList(argument, "--seeds=");
    else if (argument.startsWith("--pairs=")) parsed.pairs = positiveInteger(argument, "--pairs=");
    else if (argument.startsWith("--duration-ms=")) parsed.durationMs = positiveInteger(argument, "--duration-ms=");
    else if (argument.startsWith("--warm-rounds=")) parsed.warmRounds = nonNegativeInteger(argument, "--warm-rounds=");
    else if (argument.startsWith("--repetition=")) parsed.repetition = nonNegativeInteger(argument, "--repetition=");
    else if (argument.startsWith("--run-id=")) parsed.runId = safeRunId(argument.slice(9));
    else if (argument.startsWith("--out-dir=")) parsed.outDir = path.resolve(ROOT_DIR, argument.slice(10));
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return parsed;
}

function integerList(argument, prefix) {
  const values = argument.slice(prefix.length).split(",").map((value) => Number(value));
  if (!values.length || values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new TypeError(`${prefix.slice(0, -1)} requires comma-separated non-negative integers`);
  }
  return values;
}

function positiveInteger(argument, prefix) {
  const value = nonNegativeInteger(argument, prefix);
  if (value === 0) throw new TypeError(`${prefix.slice(0, -1)} must be greater than zero`);
  return value;
}

function nonNegativeInteger(argument, prefix) {
  const value = Number(argument.slice(prefix.length));
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${prefix.slice(0, -1)} requires a non-negative integer`);
  }
  return value;
}

function safeRunId(value) {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) throw new TypeError("run id contains unsafe characters");
  return value;
}

function makeRunId(commit, repetition) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${timestamp}_${commit.slice(0, 12)}_r${repetition}`;
}

function readGitRevision() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: ROOT_DIR, encoding: "utf8" });
    return { commit, dirty: status.length > 0 };
  } catch {
    return { commit: "unknown", dirty: true };
  }
}

function installedVersion(name) {
  let current = path.dirname(require.resolve(name));
  while (current !== path.dirname(current)) {
    const manifest = path.join(current, "package.json");
    if (fs.existsSync(manifest)) {
      const packageData = JSON.parse(fs.readFileSync(manifest, "utf8"));
      if (packageData.name === name) return packageData.version;
    }
    current = path.dirname(current);
  }
  return "unknown";
}

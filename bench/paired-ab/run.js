// bench/paired-ab/run.js
//
// Paired A/B throughput comparison built to give usable answers on a host
// that is not quiet. See README.md for the design and how to read the output.
//
//   node bench/paired-ab/run.js --out-dir=<external-directory> \
//     [--baseline=<checkout of an earlier revision>] \
//     [--processes=12] [--rounds=10] [--block-ms=15] [--only=<substring>]
//
// Run from the repository root. Output goes outside the checkout.
"use strict";

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mean, median, signTestP, standardDeviation, tTest } from "./stats.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const SELF = fileURLToPath(import.meta.url);

function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const settings = {
  processes: Number(option("processes", 12)),
  rounds: Number(option("rounds", 10)),
  blockMs: Number(option("block-ms", 15)),
  only: option("only", ""),
  baseline: option("baseline", "")
};

// ---------------------------------------------------------------- workloads

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const PAIRS = 256;

function createRandom(seed) {
  // mulberry32: every process sees the same strings.
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(random, length) {
  let value = "";
  for (let i = 0; i < length; i++) value += ALPHABET[(random() * ALPHABET.length) | 0];
  return value;
}

function substitute(random, value, edits) {
  const units = [...value];
  for (let e = 0; e < edits && units.length > 0; e++) {
    units[(random() * units.length) | 0] = ALPHABET[(random() * ALPHABET.length) | 0];
  }
  return units.join("");
}

// Half unrelated pairs, half near-duplicates, all of equal length.
function buildWorkload(length) {
  const random = createRandom(0x5eed0000 + length);
  const left = [];
  const right = [];
  for (let i = 0; i < PAIRS; i++) {
    const value = randomString(random, length);
    left.push(value);
    right.push(i % 2 ? substitute(random, value, 2) : randomString(random, length));
  }
  const candidates = [];
  for (let i = 0; i < 16; i++) candidates.push(i % 4 ? randomString(random, length) : substitute(random, left[0], 3));
  return { left, right, candidates };
}

// Each variant gets its own runner compiled from source text, so the call
// site inside the loop only ever sees one target and stays monomorphic.
const RUNNER_BODIES = {
  pair: "let s = 0; for (let p = 0; p < passes; p++) for (let i = 0; i < n; i++) s += fn(left[i], right[i]); return s;",
  max: "let s = 0; for (let p = 0; p < passes; p++) for (let i = 0; i < n; i++) s += fn(left[i], right[i], 3); return s;",
  closest: "let s = 0; for (let p = 0; p < passes; p++) for (let i = 0; i < n; i += 16) s += fn(left[i], candidates).length; return s;"
};

function makeRunner(kind, fn, workload) {
  const run = new Function("fn", "left", "right", "candidates", "n", "passes", RUNNER_BODIES[kind]);
  return (passes) => run(fn, workload.left, workload.right, workload.candidates, PAIRS, passes);
}

// -------------------------------------------------------------- comparisons

async function loadComparisons() {
  const load = (path, tag = "") => import(pathToFileURL(path).href + tag);
  const current = await load(join(REPO_ROOT, "src", "index.js"));
  const currentCopy = await load(join(REPO_ROOT, "src", "index.js"), "?control");
  const currentV2 = await load(join(REPO_ROOT, "src", "v2", "index.js"));
  const pooledV2 = await load(join(REPO_ROOT, "bench", "shared-peq-spike", "kernels", "index.js"));

  const comparisons = [
    // Same code loaded twice: the measured "difference" is the method's noise floor.
    { id: "control distance", kind: "pair", a: current.distance, b: currentCopy.distance, lengths: [4, 16, 64] },
    { id: "pool v2", kind: "pair", a: currentV2.levenshteinLightning, b: pooledV2.levenshteinLightning, lengths: [4, 16, 32, 64, 96, 128, 200, 256, 400, 1024] }
  ];

  if (settings.baseline) {
    const base = await load(join(settings.baseline, "src", "index.js"));
    const baseV2 = await load(join(settings.baseline, "src", "v2", "index.js"));
    const short = [1, 2, 4, 8, 16, 32, 64, 128];
    comparisons.push(
      { id: "baseline distance", kind: "pair", a: base.distance, b: current.distance, lengths: short },
      { id: "baseline distanceMax", kind: "max", a: base.distanceMax, b: current.distanceMax, lengths: [...short, 300] },
      { id: "baseline closest", kind: "closest", a: base.closest, b: current.closest, lengths: [4, 8, 16, 32, 64, 128] },
      { id: "baseline v2", kind: "pair", a: baseV2.levenshteinLightning, b: currentV2.levenshteinLightning, lengths: short }
    );
  }

  return comparisons.filter((comparison) => comparison.id.includes(settings.only));
}

// ------------------------------------------------------------------- child

const now = () => Number(process.hrtime.bigint());

function timeBlock(runner, passes) {
  const start = now();
  runner(passes);
  return now() - start;
}

function measureCell(comparison, length) {
  const workload = buildWorkload(length);
  const runA = makeRunner(comparison.kind, comparison.a, workload);
  const runB = makeRunner(comparison.kind, comparison.b, workload);

  if (runA(1) !== runB(1)) throw new Error(`${comparison.id} n=${length}: variants disagree`);

  // Warm both until optimized code is in place, alternating so neither owns
  // the caches when timing starts.
  let passes = 1;
  for (let spent = 0; spent < 120e6;) {
    spent += timeBlock(runA, passes) + timeBlock(runB, passes);
    if (spent < 20e6) passes *= 2;
  }

  // One block is a fixed amount of work, sized from variant A, so both
  // variants do identical work per block and only time differs.
  const single = Math.min(timeBlock(runA, passes), timeBlock(runA, passes)) / passes;
  passes = Math.max(1, Math.round((settings.blockMs * 1e6) / single));

  // ABBA / BAAB rounds: within a round each variant runs once early and once
  // late, so drift and interruptions fall on both about equally.
  const logRatios = [];
  let timeA = 0;
  let timeB = 0;
  for (let round = 0; round < settings.rounds; round++) {
    let a;
    let b;
    if (round % 2 === 0) {
      a = timeBlock(runA, passes);
      b = timeBlock(runB, passes);
      b += timeBlock(runB, passes);
      a += timeBlock(runA, passes);
    } else {
      b = timeBlock(runB, passes);
      a = timeBlock(runA, passes);
      a += timeBlock(runA, passes);
      b += timeBlock(runB, passes);
    }
    logRatios.push(Math.log(b / a));
    timeA += a;
    timeB += b;
  }

  const calls = 2 * settings.rounds * passes * (comparison.kind === "closest" ? PAIRS / 16 : PAIRS);
  return {
    id: comparison.id,
    length,
    // The median round is the process's estimate: one preempted block cannot move it.
    logRatio: median(logRatios),
    roundSd: standardDeviation(logRatios),
    nsPerCallA: timeA / calls,
    nsPerCallB: timeB / calls
  };
}

async function child() {
  const cells = [];
  for (const comparison of await loadComparisons()) {
    for (const length of comparison.lengths) cells.push(measureCell(comparison, length));
  }
  process.stdout.write(JSON.stringify(cells));
}

// ------------------------------------------------------------------ parent

const percent = (logRatio) => (Math.exp(logRatio) - 1) * 100;
const signed = (value, digits = 2) => `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

function summarize(runs) {
  const byCell = new Map();
  for (const cells of runs) {
    for (const cell of cells) {
      const key = `${cell.id}|${cell.length}`;
      if (!byCell.has(key)) byCell.set(key, []);
      byCell.get(key).push(cell);
    }
  }

  const rows = [];
  for (const samples of byCell.values()) {
    const logRatios = samples.map((sample) => sample.logRatio);
    const test = tTest(logRatios);
    rows.push({
      id: samples[0].id,
      length: samples[0].length,
      processes: samples.length,
      nsPerCallA: median(samples.map((sample) => sample.nsPerCallA)),
      nsPerCallB: median(samples.map((sample) => sample.nsPerCallB)),
      meanPercent: percent(test.mean),
      medianPercent: percent(test.median),
      lowPercent: percent(test.low),
      highPercent: percent(test.high),
      sdPercent: test.sd * 100,
      withinProcessSdPercent: mean(samples.map((sample) => sample.roundSd)) * 100,
      t: test.t,
      df: test.df,
      p: test.p,
      signP: signTestP(logRatios),
      logRatios
    });
  }

  // Holm step-down over every non-control cell keeps the chance of any false
  // "significant" at 5% across the whole table.
  const tested = rows.filter((row) => !row.id.startsWith("control")).sort((x, y) => x.p - y.p);
  let stillRejecting = true;
  tested.forEach((row, index) => {
    stillRejecting = stillRejecting && row.p < 0.05 / (tested.length - index);
    row.significant = stillRejecting;
  });
  return rows;
}

function printTable(rows) {
  console.log("\nB relative to A, time per call. Negative = B is faster.\n");
  console.log("comparison          n     A ns/call  B ns/call   mean%  median%   95% CI            sd%     t       p      verdict");
  for (const row of rows) {
    const verdict = row.id.startsWith("control")
      ? "(noise floor)"
      : row.significant ? (row.meanPercent < 0 ? "B faster" : "B slower") : "no difference shown";
    console.log([
      row.id.padEnd(18),
      String(row.length).padStart(5),
      row.nsPerCallA.toFixed(1).padStart(11),
      row.nsPerCallB.toFixed(1).padStart(10),
      signed(row.meanPercent).padStart(8),
      signed(row.medianPercent).padStart(8),
      `[${signed(row.lowPercent)}, ${signed(row.highPercent)}]`.padStart(18),
      row.sdPercent.toFixed(2).padStart(6),
      signed(row.t, 1).padStart(7),
      (row.p < 0.0001 ? "<0.0001" : row.p.toFixed(4)).padStart(8),
      " ", verdict
    ].join(" "));
  }
}

function parent() {
  const outArgument = option("out-dir", "");
  if (!outArgument) throw new Error("paired-ab requires --out-dir=<external-directory>");
  const outDirectory = resolve(outArgument);
  const fromRoot = relative(REPO_ROOT, outDirectory);
  if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) {
    throw new Error("--out-dir must be outside the repository checkout");
  }
  if (settings.baseline && !existsSync(join(settings.baseline, "src", "index.js"))) {
    throw new Error(`--baseline has no src/index.js: ${settings.baseline}`);
  }
  if (!(settings.processes >= 2)) throw new Error("--processes must be at least 2: processes are the samples");
  mkdirSync(outDirectory, { recursive: true });

  const childArguments = [SELF, "--child", ...process.argv.slice(2)];
  const runs = [];
  for (let index = 0; index < settings.processes; index++) {
    const started = Date.now();
    const result = spawnSync(process.execPath, childArguments, { encoding: "utf8", maxBuffer: 1 << 26 });
    if (result.status !== 0) throw new Error(`process ${index} failed:\n${result.stderr}`);
    runs.push(JSON.parse(result.stdout));
    console.log(`process ${index + 1}/${settings.processes} done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }

  const rows = summarize(runs);
  printTable(rows);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = join(outDirectory, `paired-ab_${stamp}.json`);
  writeFileSync(outFile, JSON.stringify({
    generated: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: cpus()[0]?.model,
    settings: { ...settings, baseline: settings.baseline ? "provided" : "" },
    rows
  }, null, 2));
  console.log(`\nwrote ${outFile}`);
}

if (process.argv.includes("--child")) await child();
else parent();

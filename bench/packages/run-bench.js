
// bench\packages\run-bench.js



import fs from "fs";
import os from "os";
import path from "path";

import { buildPairs, median, mean } from "../data.js";

import { distance as fastestLevenshtein } from "fastest-levenshtein";
import jsLevenshtein from "js-levenshtein";
import leven from "leven";


// fast-levenshtein, calls fastestLevenshtein internally, so its not needed to bench
// import FastLevenshtein from "fast-levenshtein";

import { levenshteinEditDistance } from "levenshtein-edit-distance";

import { levenshteinLightning } from "../lightning-levenshtein-v2.min.js";
import { distance as levenshteinLightning_v1 } from "../../dist/lightning-levenshtein.min.js";

const OUT_DIR = path.resolve("bench/packages");
const OUT_FILE = path.join(OUT_DIR, "results.json");

const LENGTHS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const SEEDS = [1337, 7331, 20250321];
const PAIRS = 500;
const DURATION_MS = 500;
const WARM_ROUNDS = 3;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const TARGETS = [
    ["lightning-levenshtein-v2", (a, b) => levenshteinLightning(a, b)],
    ["lightning-levenshtein-v1", (a, b) => levenshteinLightning_v1(a, b)],

    ["fastest-levenshtein", (a, b) => fastestLevenshtein(a, b)],
    ["js-levenshtein", (a, b) => jsLevenshtein(a, b)],
    ["leven", (a, b) => leven(a, b)],
    // ["fast-levenshtein", (a, b) => FastLevenshtein.get(a, b)],
    ["levenshtein-edit-distance", (a, b) => levenshteinEditDistance(a, b)],
];

const warm = (fn, pairs, rounds = WARM_ROUNDS) => {
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < pairs.length; i++) {
            const [a, b] = pairs[i];
            fn(a, b);
        }
    }
};

const benchOne = (fn, pairs, durationMs) => {
    let calls = 0;
    const t0 = performance.now();
    let elapsed = 0;

    while (elapsed < durationMs) {
        for (let i = 0; i < pairs.length; i++) {
            const [a, b] = pairs[i];
            fn(a, b);
            calls++;
        }
        elapsed = performance.now() - t0;
    }

    return {
        calls,
        elapsed,
        opsPerMs: calls / elapsed,
        opsPerSec: (calls / elapsed) * 1000,
    };
};

const results = {
    meta: {
        generatedAt: new Date().toISOString(),
        pairs: PAIRS,
        durationMs: DURATION_MS,
        warmRounds: WARM_ROUNDS,
        lengths: LENGTHS,
        seeds: SEEDS,
        alphabet: ALPHABET,
        unit: "ops/sec",
        primaryMetric: "meanOpsPerMs",
        aggregation: "arithmetic mean across seeds",
        runtime: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            cpu: os.cpus()[0]?.model ?? "unknown",
        },
        note: "Mean across seeds. 500 random equal-length string pairs per N.",
    },
    results: {},
};

for (const len of LENGTHS) {
    console.log(`\n=== N=${len} ===`);
    results.results[len] = {};

    for (const [name] of TARGETS) {
        results.results[len][name] = {
            seedRuns: [],
            meanOpsPerMs: 0,
            meanOpsPerSec: 0,
            medianOpsPerMs: 0,
            medianOpsPerSec: 0,
        };
    }

    for (const seed of SEEDS) {
        console.log(`Seed ${seed}`);

        const pairs = buildPairs({
            count: PAIRS,
            lenA: len,
            lenB: len,
            seed,
            alphabet: ALPHABET,
        });

        for (const [name, fn] of TARGETS) {
            warm(fn, pairs);
            const r = benchOne(fn, pairs, DURATION_MS);

            results.results[len][name].seedRuns.push({
                seed,
                calls: r.calls,
                elapsed: r.elapsed,
                opsPerMs: r.opsPerMs,
                opsPerSec: r.opsPerSec,
            });

            console.log(
                `${name.padEnd(28)} ${r.opsPerMs.toFixed(2).padStart(12)} ops/ms`
            );
        }
    }

    for (const [name] of TARGETS) {
        const opsMs = results.results[len][name].seedRuns.map((x) => x.opsPerMs);
        const opsSec = results.results[len][name].seedRuns.map((x) => x.opsPerSec);

        results.results[len][name].meanOpsPerMs = mean(opsMs);
        results.results[len][name].meanOpsPerSec = mean(opsSec);
        results.results[len][name].medianOpsPerMs = median(opsMs);
        results.results[len][name].medianOpsPerSec = median(opsSec);
    }

    const ranked = Object.entries(results.results[len])
        .map(([name, data]) => [name, data.meanOpsPerMs])
        .sort((a, b) => b[1] - a[1]);

    console.log("\nMean ranking:");
    for (const [name, value] of ranked) {
        console.log(`${name.padEnd(28)} ${value.toFixed(2).padStart(12)} ops/ms`);
    }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf8");

console.log(`\nWrote ${OUT_FILE}`);

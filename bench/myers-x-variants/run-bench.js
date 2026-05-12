
// myers-x-variants\run-bench.js

import { buildPairs } from "../data.js";
import { myers_x_baseline } from "./myers_x_baseline.js";


import { myers_512 } from "./myers_512.js";
import { myers_x128 } from "./myers_x128.js";
import { myers_x64 } from "./myers_x64.js";
import { myers_x1 } from "./myers_x1.js";
import { myers_x2 } from "./myers_x2.js";
import { myers_x3 } from "./myers_x3.js";

import { myers_x4 } from "./myers_x4.js";
import { myers_x5 } from "./myers_x5.js";
import { myers_x6 } from "./myers_x6.js";
import { myers_x7 } from "./myers_x7.js";
import { distance } from "../mod.js"
import { levenshteinLightning } from "../lightning-levenshtein-v2.min.js"

import { myers_x as myers_x_old } from "../../src/myers_x.js";
import { myers_x as myers_x_old_v2 } from "./myers_x_old_v2.js";
import { myers_x as myers_x_old_v3 } from "./myers_x_old_v3.js";


const VARIANTS = [
    ["fastest-levenstein", distance],
    ["Lightning-v2", levenshteinLightning],
    ["baseline", myers_x_baseline],
    ["myers_x64", myers_x64],
    ["myers_x128", myers_x128],
    ["myers_x_old", myers_x_old],
    ["myers_x_old_v2", myers_x_old_v2],
    ["myers_x_old_v3", myers_x_old_v3],
    ["myers_x1", myers_x1],
    ["myers_x2", myers_x2],
    ["myers_x3", myers_x3],
    ["myers_x4", myers_x4],
    ["myers_x5", myers_x5],
    ["myers_x6", myers_x6],
    ["myers_x7", myers_x7],
];
// const LENGTHS = [129, 160, 200, 256, 512];

const LENGTHS = [600, 700, 800, 900, 1000];
const SEEDS = [1337, 7331, 20250321];
const PAIRS = 200;
const DURATION_MS = 500;
// const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const benchOne = (fn, pairs, durationMs) => {
    let calls = 0;
    const t0 = performance.now();
    let elapsed = 0;
    while (elapsed < durationMs) {
        for (let i = 0; i < pairs.length; i++) {
            const [a, b] = pairs[i];
            fn(a, b, a.length, b.length);
            calls++;
        }
        elapsed = performance.now() - t0;
    }
    return {
        calls,
        elapsed,
        opsPerMs: calls / elapsed,
    };
};

const warm = (fn, pairs, rounds = 3) => {
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < pairs.length; i++) {
            const [a, b] = pairs[i];
            fn(a, b, a.length, b.length);
        }
    }
};

for (const len of LENGTHS) {
    for (const seed of SEEDS) {
        const pairs = buildPairs({
            count: PAIRS,
            lenA: len,
            lenB: len,
            seed,
            alphabet: ALPHABET,
        });

        console.log(`\nLength ${len} | pairs ${PAIRS} | seed ${seed}`);

        for (const [name, fn] of VARIANTS) {
            warm(fn, pairs);
            const r = benchOne(fn, pairs, DURATION_MS);
            console.log(
                `${name.padEnd(12)} -> ${r.opsPerMs.toFixed(2)} ops/ms  ` +
                `(time: ${r.elapsed.toFixed(1)}ms, calls: ${r.calls.toLocaleString()})`
            );
        }
    }
}

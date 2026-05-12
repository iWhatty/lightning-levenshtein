

// bench\myers32-variants\run-bench.js

import { buildPairs } from "../data.js";
import { myers32_baseline } from "./myers32_baseline.js";
import { myers32_v1 } from "./myers32_v1.js";
import { myers32_v2 } from "./myers32_v2.js";
import { myers32_v3 } from "./myers32_v3.js";
import { myers32_v4 } from "./myers32_v4.js";

import { myers32_unrolledA } from "../../codegen/artifacts/myers32-unrolledA.js";
import { myers32_unrolledB } from "../../codegen/artifacts/myers32-unrolledB.js";
import { levenshteinLightning } from "../lightning-levenshtein-v2.min.js";

const VARIANTS = [
    ["baseline", myers32_baseline],
    ["myers32_v1", myers32_v1],
    ["myers32_v2", myers32_v2],
    ["myers32_v3", myers32_v3],
    ["myers32_v4", myers32_v4],
    ["unrolledA", myers32_unrolledA],
    ["unrolledB", myers32_unrolledB],
    ["Lightning-v2", levenshteinLightning],
];

const LENGTHS = [1, 2, 3, 4, 5, 8, 12, 16, 24, 31, 32];
const SEEDS = [1337, 7331, 20250321];
const PAIRS = 500;
const DURATION_MS = 500;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const warm = (fn, pairs, rounds = 3) => {
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < pairs.length; i++) {
            const [a, b] = pairs[i];
            fn(a, b, a.length, b.length);
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
                `${name.padEnd(14)} -> ${r.opsPerMs.toFixed(2)} ops/ms  ` +
                `(time: ${r.elapsed.toFixed(1)}ms, calls: ${r.calls.toLocaleString()})`
            );
        }
    }
}

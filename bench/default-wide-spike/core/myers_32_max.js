
// ./src/myers_32_max.js

import { peq } from './peq.js';


/**
 * Bit-parallel Myers' algorithm for Levenshtein distance.
 * Optimized for pattern strings ≤ 32 characters.
 *
 * @param {string} a1 - Pattern string (must be longer or equal to `b1`).
 * @param {string} b1 - Text string to compare.
 * @param {number} maxDistance - Maximum allowable edit distance.
 * @returns {number} Exact distance within the threshold, otherwise a value above it.
 */
export function myers_32_max(a1, b1, maxDistance) {


    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    let mv = 0;               // Negative bitmask (all zeros)
    let pv = -1;              // Positive bitmask (all ones)
    let score = n;            // Score starts at worst-case: all insertions
    maxDistance += m;         // Define a "safe-exit" condition, impossible to go lower than maxDistance

    // Build pattern equality masks (peq[char] has 1s at positions where a[i] === char)
    let i = n;
    while (i--) peq[a.charCodeAt(i)] |= 1 << i;


    for (let i = 0; i < m; i++) {
        const ch = b.charCodeAt(i);
        const eq = peq[ch];             // Bitmask: positions in `a` where char == b[i]
        const xv = eq | mv;             // Combine EQ and previous mismatches
        const xh = (((eq & pv) + pv) ^ pv) | eq; // Horizontal propagation

        let ph = mv | ~(xh | pv);       // Potential insertion
        let mh = pv & xh;               // Potential deletion

        // Scoring logic: update score based on bit at the highest tracked position
        const inc = (ph >>> (n - 1)) & 1;
        const dec = (mh >>> (n - 1)) & 1;
        score += inc - dec;

        // Early termination if threshold exceeded, with 1-op decrement
        if (score > maxDistance--) break;

        // Shift and update bitvectors for next iteration
        ph = (ph << 1) | 1;
        mh = (mh << 1);
        pv = mh | ~(xv | ph);
        mv = ph & xv;
    }

    // Clean only the bitmasks relevant to `a`
    i = n;
    while (i--) peq[a.charCodeAt(i)] = 0;

    return score;
};

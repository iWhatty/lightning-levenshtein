
// bench\bolt\myers_64.js

"use strict";

const peqLo = new Uint32Array(65536);
const peqHi = new Uint32Array(65536);

/**
 * Specialized 2-word Myers for 33..64 char patterns.
 * Assumes a.length >= b.length.
 *
 * a = longer string / pattern
 * b = shorter string / text
 */
export function myers_64(a1, b1) {

    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    let pv0 = -1, mv0 = 0;
    let pv1 = -1, mv1 = 0;
    let score = n;

    // Build split PEQ masks for a
    let i = 0;
    for (; i < 32; i++) {
        peqLo[a.charCodeAt(i)] |= (1 << (i & 31));
    }
    for (; i < n; i++) {
        peqHi[a.charCodeAt(i)] |= (1 << (i & 31));
    }

    const lastIndex = n - 1;
    // const lastWord = lastIndex >>> 5;
    const lastBit = lastIndex & 31;
    const lastMask = 1 << lastBit;

    for (i = 0; i < m; i++) {
        const ch = b.charCodeAt(i);

        // ---- word 0 ----
        let eq0 = peqLo[ch];
        const xv0 = eq0 | mv0;
        eq0 |= ((eq0 & pv0) + pv0) ^ pv0;
        let ph0 = mv0 | ~(eq0 | pv0);
        let mh0 = pv0 & eq0;

        // carry out of low word before shift
        const carryPh0 = (ph0 >>> 31) & 1;
        const carryMh0 = (mh0 >>> 31) & 1;

        // if (lastWord === 0) {
        //     if (ph0 & lastMask) score++;
        //     if (mh0 & lastMask) score--;
        // }

        ph0 = (ph0 << 1) | 1;
        mh0 = (mh0 << 1);

        pv0 = mh0 | ~(xv0 | ph0);
        mv0 = ph0 & xv0;

        // ---- word 1 ----
        let eq1 = peqHi[ch];
        const xv1 = eq1 | mv1;
        eq1 |= ((eq1 & pv1) + pv1) ^ pv1;
        let ph1 = mv1 | ~(eq1 | pv1);
        let mh1 = pv1 & eq1;

        // if (lastWord === 1) {
        if (ph1 & lastMask) score++;
        if (mh1 & lastMask) score--;
        // }

        ph1 = (ph1 << 1) | carryPh0;
        mh1 = (mh1 << 1) | carryMh0;

        pv1 = mh1 | ~(xv1 | ph1);
        mv1 = ph1 & xv1;
    }

    // clear PEQ
    i = 0;
    for (; i < 32; i++) {
        peqLo[a.charCodeAt(i)] = 0;
    }
    for (; i < n; i++) {
        peqHi[a.charCodeAt(i)] = 0;
    }

    return score;
}
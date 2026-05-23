// bench/bolt/myers_128.js
"use strict";


const peq0 = new Uint32Array(65536);
const peq1 = new Uint32Array(65536);
const peq2 = new Uint32Array(65536);
const peq3 = new Uint32Array(65536);

/**
 * Specialized 4-word Myers for 97..128 char patterns.
 * Assumes a.length >= b.length.
 *
 * a = longer string / pattern
 * b = shorter string / text
 */
export function myers_128(a1, b1) {

    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    let pv0 = -1, mv0 = 0;
    let pv1 = -1, mv1 = 0;
    let pv2 = -1, mv2 = 0;
    let pv3 = -1, mv3 = 0;

    let score = n;
    let i = 0;

    // Build PEQ
    i = 0;
    for (; i < 32; i++) {
        peq0[a.charCodeAt(i)] |= 1 << i;
        peq1[a.charCodeAt(i + 32)] |= 1 << i;
        peq2[a.charCodeAt(i + 64)] |= 1 << i;
    }
    for (i = 96; i < n; i++) {
        peq3[a.charCodeAt(i)] |= 1 << (i & 31);
    }

    const lastIndex = n - 1;
    // const lastWord = lastIndex >>> 5;
    const lastBit = lastIndex & 31;
    const lastMask = 1 << lastBit;

    for (i = 0; i < m; i++) {
        const ch = b.charCodeAt(i);

        let carryEq = 0;

        // ---- word 0 ----
        let eq0 = peq0[ch];
        const xv0 = eq0 | mv0;
        let t0 = ((eq0 & pv0) >>> 0) + (pv0 >>> 0) + carryEq;
        carryEq = t0 > 0xffffffff ? 1 : 0;
        let xh0 = ((t0 >>> 0) ^ pv0) | eq0;
        let ph0 = mv0 | ~(xh0 | pv0);
        let mh0 = pv0 & xh0;

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
        let eq1 = peq1[ch];
        const xv1 = eq1 | mv1;
        let t1 = ((eq1 & pv1) >>> 0) + (pv1 >>> 0) + carryEq;
        carryEq = t1 > 0xffffffff ? 1 : 0;
        let xh1 = ((t1 >>> 0) ^ pv1) | eq1;
        let ph1 = mv1 | ~(xh1 | pv1);
        let mh1 = pv1 & xh1;

        const carryPh1 = (ph1 >>> 31) & 1;
        const carryMh1 = (mh1 >>> 31) & 1;

        // if (lastWord === 1) {
        //     if (ph1 & lastMask) score++;
        //     if (mh1 & lastMask) score--;
        // }

        ph1 = (ph1 << 1) | carryPh0;
        mh1 = (mh1 << 1) | carryMh0;

        pv1 = mh1 | ~(xv1 | ph1);
        mv1 = ph1 & xv1;

        // ---- word 2 ----
        let eq2 = peq2[ch];
        const xv2 = eq2 | mv2;
        let t2 = ((eq2 & pv2) >>> 0) + (pv2 >>> 0) + carryEq;
        carryEq = t2 > 0xffffffff ? 1 : 0;
        let xh2 = ((t2 >>> 0) ^ pv2) | eq2;
        let ph2 = mv2 | ~(xh2 | pv2);
        let mh2 = pv2 & xh2;

        const carryPh2 = (ph2 >>> 31) & 1;
        const carryMh2 = (mh2 >>> 31) & 1;

        // if (lastWord === 2) {
        //     if (ph2 & lastMask) score++;
        //     if (mh2 & lastMask) score--;
        // }

        ph2 = (ph2 << 1) | carryPh1;
        mh2 = (mh2 << 1) | carryMh1;

        pv2 = mh2 | ~(xv2 | ph2);
        mv2 = ph2 & xv2;

        // ---- word 3 ----
        let eq3 = peq3[ch];
        const xv3 = eq3 | mv3;
        let t3 = ((eq3 & pv3) >>> 0) + (pv3 >>> 0) + carryEq;
        let xh3 = ((t3 >>> 0) ^ pv3) | eq3;
        let ph3 = mv3 | ~(xh3 | pv3);
        let mh3 = pv3 & xh3;

        // if (lastWord === 3) {
        if (ph3 & lastMask) score++;
        if (mh3 & lastMask) score--;
        // }

        ph3 = (ph3 << 1) | carryPh2;
        mh3 = (mh3 << 1) | carryMh2;

        pv3 = mh3 | ~(xv3 | ph3);
        mv3 = ph3 & xv3;
    }

    // Clear PEQ 128
    i = 0;
    for (; i < 32; i++) {
        peq0[a.charCodeAt(i)] = 0;
        peq1[a.charCodeAt(i + 32)] = 0;
        peq2[a.charCodeAt(i + 64)] = 0;
    }
    for (i = 96; i < n; i++) {
        peq3[a.charCodeAt(i)] = 0;
    }

    return score;
}
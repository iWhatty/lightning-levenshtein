// ./bench/bolt/myers_x64.js

"use strict";

const peq0 = new Uint32Array(65536);
const peq1 = new Uint32Array(65536);

let phcBuf = new Int32Array(0);
let mhcBuf = new Int32Array(0);

const ensureScratch = (size) => {
    if (phcBuf.length < size) {
        phcBuf = new Int32Array(size);
        mhcBuf = new Int32Array(size);
    }
    let i = size;
    while (i--) {
        phcBuf[i] = -1;
        mhcBuf[i] = 0;
    }
};

/**
 * Any-length Myers variant using 64-char vertical macro-blocks,
 * implemented as 2 x 32-bit lanes.
 *
 * a = source/query
 * b = target/reference
 */
export function myers_x64(a1, b1) {

    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    const hsize = (n + 31) >> 5;
    const vsize = (m + 63) >> 6; // 64-char vertical blocks

    ensureScratch(hsize);
    const phc = phcBuf;
    const mhc = mhcBuf;

    // ---- process all non-final 64-char blocks ----
    for (let j = 0; j < vsize - 1; j++) {
        const start = j << 6;         // j * 64
        const mid = start + 32;
        const end = start + 64;

        let pv0 = -1, mv0 = 0;
        let pv1 = -1, mv1 = 0;

        // Build PEQ for this 64-char block
        for (let k = start; k < mid; k++) {
            peq0[b.charCodeAt(k)] |= 1 << (k - start);
        }
        for (let k = mid; k < end; k++) {
            peq1[b.charCodeAt(k)] |= 1 << (k - mid);
        }

        for (let i = 0; i < n; i++) {
            const ch = a.charCodeAt(i);
            const idx = i >> 5;
            const bit = i & 31;

            const pb = (phc[idx] >>> bit) & 1;
            const mb = (mhc[idx] >>> bit) & 1;

            // ---- lane 0 ----
            let eq0 = peq0[ch];
            const xv0 = eq0 | mv0;

            let t0 = ((eq0 & pv0) >>> 0) + (pv0 >>> 0) + mb;
            let carryEq = t0 > 0xffffffff ? 1 : 0;

            let xh0 = ((t0 >>> 0) ^ pv0) | eq0;
            let ph0 = mv0 | ~(xh0 | pv0);
            let mh0 = pv0 & xh0;

            const carryPh0 = (ph0 >>> 31) & 1;
            const carryMh0 = (mh0 >>> 31) & 1;

            ph0 = (ph0 << 1) | pb;
            mh0 = (mh0 << 1) | mb;

            pv0 = mh0 | ~(xv0 | ph0);
            mv0 = ph0 & xv0;

            // ---- lane 1 ----
            let eq1 = peq1[ch];
            const xv1 = eq1 | mv1;

            let t1 = ((eq1 & pv1) >>> 0) + (pv1 >>> 0) + carryEq;
            let xh1 = ((t1 >>> 0) ^ pv1) | eq1;
            let ph1 = mv1 | ~(xh1 | pv1);
            let mh1 = pv1 & xh1;

            const carryPh1 = (ph1 >>> 31) & 1;
            const carryMh1 = (mh1 >>> 31) & 1;

            ph1 = (ph1 << 1) | carryPh0;
            mh1 = (mh1 << 1) | carryMh0;

            pv1 = mh1 | ~(xv1 | ph1);
            mv1 = ph1 & xv1;

            // write horizontal carry-out of full 64-bit macro-block
            phc[idx] ^= (carryPh1 ^ pb) << bit;
            mhc[idx] ^= (carryMh1 ^ mb) << bit;
        }

        // Clear PEQ
        for (let k = start; k < mid; k++) {
            peq0[b.charCodeAt(k)] = 0;
        }
        for (let k = mid; k < end; k++) {
            peq1[b.charCodeAt(k)] = 0;
        }
    }

    // ---- final block ----
    const start = (vsize - 1) << 6;
    const mid = start + 32;
    const end = m;

    let pv0 = -1, mv0 = 0;
    let pv1 = -1, mv1 = 0;

    const loEnd = end < mid ? end : mid;

    for (let k = start; k < loEnd; k++) {
        peq0[b.charCodeAt(k)] |= 1 << (k - start);
    }
    for (let k = mid; k < end; k++) {
        peq1[b.charCodeAt(k)] |= 1 << (k - mid);
    }

    let score = m;

    const finalLen = end - start;
    const finalInHi = finalLen > 32;
    const shift = finalInHi ? (finalLen - 33) : (finalLen - 1);

    for (let i = 0; i < n; i++) {
        const ch = a.charCodeAt(i);
        const idx = i >> 5;
        const bit = i & 31;

        const pb = (phc[idx] >>> bit) & 1;
        const mb = (mhc[idx] >>> bit) & 1;

        // ---- lane 0 ----
        let eq0 = peq0[ch];
        const xv0 = eq0 | mv0;

        let t0 = ((eq0 & pv0) >>> 0) + (pv0 >>> 0) + mb;
        let carryEq = t0 > 0xffffffff ? 1 : 0;

        let xh0 = ((t0 >>> 0) ^ pv0) | eq0;
        let ph0 = mv0 | ~(xh0 | pv0);
        let mh0 = pv0 & xh0;

        const carryPh0 = (ph0 >>> 31) & 1;
        const carryMh0 = (mh0 >>> 31) & 1;

        // ---- lane 1 ----
        let eq1 = peq1[ch];
        const xv1 = eq1 | mv1;

        let t1 = ((eq1 & pv1) >>> 0) + (pv1 >>> 0) + carryEq;
        let xh1 = ((t1 >>> 0) ^ pv1) | eq1;
        let ph1 = mv1 | ~(xh1 | pv1);
        let mh1 = pv1 & xh1;

        // score from actual last live bit
        if (!finalInHi) {
            score += (ph0 >>> shift) & 1;
            score -= (mh0 >>> shift) & 1;
        } else {
            score += (ph1 >>> shift) & 1;
            score -= (mh1 >>> shift) & 1;
        }

        const carryPh1 = (ph1 >>> 31) & 1;
        const carryMh1 = (mh1 >>> 31) & 1;

        ph0 = (ph0 << 1) | pb;
        mh0 = (mh0 << 1) | mb;
        pv0 = mh0 | ~(xv0 | ph0);
        mv0 = ph0 & xv0;

        ph1 = (ph1 << 1) | carryPh0;
        mh1 = (mh1 << 1) | carryMh0;
        pv1 = mh1 | ~(xv1 | ph1);
        mv1 = ph1 & xv1;

        phc[idx] ^= (carryPh1 ^ pb) << bit;
        mhc[idx] ^= (carryMh1 ^ mb) << bit;
    }

    // Clear final PEQ
    for (let k = start; k < loEnd; k++) {
        peq0[b.charCodeAt(k)] = 0;
    }
    for (let k = mid; k < end; k++) {
        peq1[b.charCodeAt(k)] = 0;
    }

    return score;
}
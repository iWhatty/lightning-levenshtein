
// bench\bolt\myers_x128.js

"use strict";

const peq0 = new Uint32Array(65536);
const peq1 = new Uint32Array(65536);
const peq2 = new Uint32Array(65536);
const peq3 = new Uint32Array(65536);

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
 * Any-length Myers variant using 128-char vertical macro-blocks,
 * implemented as 4 x 32-bit lanes.
 *
 * a = source/query
 * b = target/reference
 */
export function myers_x128(a1, b1) {
    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    const hsize = (n + 31) >> 5;
    const vsize = (m + 127) >> 7;

    ensureScratch(hsize);
    const phc = phcBuf;
    const mhc = mhcBuf;

    // ---- process all non-final 128-char blocks ----
    for (let j = 0; j < vsize - 1; j++) {
        const start = j << 7;      // j * 128
        const s1 = start + 32;
        const s2 = start + 64;
        const s3 = start + 96;
        const end = start + 128;

        let pv0 = -1, mv0 = 0;
        let pv1 = -1, mv1 = 0;
        let pv2 = -1, mv2 = 0;
        let pv3 = -1, mv3 = 0;

        for (let k = start; k < s1; k++) peq0[b.charCodeAt(k)] |= 1 << (k - start);
        for (let k = s1; k < s2; k++) peq1[b.charCodeAt(k)] |= 1 << (k - s1);
        for (let k = s2; k < s3; k++) peq2[b.charCodeAt(k)] |= 1 << (k - s2);
        for (let k = s3; k < end; k++) peq3[b.charCodeAt(k)] |= 1 << (k - s3);

        for (let i = 0; i < n; i++) {
            const ch = a.charCodeAt(i);
            const idx = i >> 5;
            const bit = i & 31;

            const pb = (phc[idx] >>> bit) & 1;
            const mb = (mhc[idx] >>> bit) & 1;

            // lane 0
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

            // lane 1
            let eq1 = peq1[ch];
            const xv1 = eq1 | mv1;
            let t1 = ((eq1 & pv1) >>> 0) + (pv1 >>> 0) + carryEq;
            carryEq = t1 > 0xffffffff ? 1 : 0;
            let xh1 = ((t1 >>> 0) ^ pv1) | eq1;
            let ph1 = mv1 | ~(xh1 | pv1);
            let mh1 = pv1 & xh1;
            const carryPh1 = (ph1 >>> 31) & 1;
            const carryMh1 = (mh1 >>> 31) & 1;
            ph1 = (ph1 << 1) | carryPh0;
            mh1 = (mh1 << 1) | carryMh0;
            pv1 = mh1 | ~(xv1 | ph1);
            mv1 = ph1 & xv1;

            // lane 2
            let eq2 = peq2[ch];
            const xv2 = eq2 | mv2;
            let t2 = ((eq2 & pv2) >>> 0) + (pv2 >>> 0) + carryEq;
            carryEq = t2 > 0xffffffff ? 1 : 0;
            let xh2 = ((t2 >>> 0) ^ pv2) | eq2;
            let ph2 = mv2 | ~(xh2 | pv2);
            let mh2 = pv2 & xh2;
            const carryPh2 = (ph2 >>> 31) & 1;
            const carryMh2 = (mh2 >>> 31) & 1;
            ph2 = (ph2 << 1) | carryPh1;
            mh2 = (mh2 << 1) | carryMh1;
            pv2 = mh2 | ~(xv2 | ph2);
            mv2 = ph2 & xv2;

            // lane 3
            let eq3 = peq3[ch];
            const xv3 = eq3 | mv3;
            let t3 = ((eq3 & pv3) >>> 0) + (pv3 >>> 0) + carryEq;
            let xh3 = ((t3 >>> 0) ^ pv3) | eq3;
            let ph3 = mv3 | ~(xh3 | pv3);
            let mh3 = pv3 & xh3;
            const carryPh3 = (ph3 >>> 31) & 1;
            const carryMh3 = (mh3 >>> 31) & 1;
            ph3 = (ph3 << 1) | carryPh2;
            mh3 = (mh3 << 1) | carryMh2;
            pv3 = mh3 | ~(xv3 | ph3);
            mv3 = ph3 & xv3;

            phc[idx] ^= (carryPh3 ^ pb) << bit;
            mhc[idx] ^= (carryMh3 ^ mb) << bit;
        }

        for (let k = start; k < s1; k++) peq0[b.charCodeAt(k)] = 0;
        for (let k = s1; k < s2; k++) peq1[b.charCodeAt(k)] = 0;
        for (let k = s2; k < s3; k++) peq2[b.charCodeAt(k)] = 0;
        for (let k = s3; k < end; k++) peq3[b.charCodeAt(k)] = 0;
    }

    // ---- final block ----
    const start = (vsize - 1) << 7;
    const s1 = start + 32;
    const s2 = start + 64;
    const s3 = start + 96;
    const end = m;

    let pv0 = -1, mv0 = 0;
    let pv1 = -1, mv1 = 0;
    let pv2 = -1, mv2 = 0;
    let pv3 = -1, mv3 = 0;

    const e0 = end < s1 ? end : s1;
    const e1 = end < s2 ? end : s2;
    const e2 = end < s3 ? end : s3;

    for (let k = start; k < e0; k++) peq0[b.charCodeAt(k)] |= 1 << (k - start);
    for (let k = s1; k < e1; k++) peq1[b.charCodeAt(k)] |= 1 << (k - s1);
    for (let k = s2; k < e2; k++) peq2[b.charCodeAt(k)] |= 1 << (k - s2);
    for (let k = s3; k < end; k++) peq3[b.charCodeAt(k)] |= 1 << (k - s3);

    let score = m;
    const finalLen = end - start;
    const last = finalLen - 1;
    const shift = last & 31;
    const scoreLane0 = last < 32;
    const scoreLane1 = last >= 32 && last < 64;
    const scoreLane2 = last >= 64 && last < 96;

    for (let i = 0; i < n; i++) {
        const ch = a.charCodeAt(i);
        const idx = i >> 5;
        const bit = i & 31;

        const pb = (phc[idx] >>> bit) & 1;
        const mb = (mhc[idx] >>> bit) & 1;

        let eq0 = peq0[ch];
        const xv0 = eq0 | mv0;
        let t0 = ((eq0 & pv0) >>> 0) + (pv0 >>> 0) + mb;
        let carryEq = t0 > 0xffffffff ? 1 : 0;
        let xh0 = ((t0 >>> 0) ^ pv0) | eq0;
        let ph0 = mv0 | ~(xh0 | pv0);
        let mh0 = pv0 & xh0;
        const carryPh0 = (ph0 >>> 31) & 1;
        const carryMh0 = (mh0 >>> 31) & 1;

        let eq1 = peq1[ch];
        const xv1 = eq1 | mv1;
        let t1 = ((eq1 & pv1) >>> 0) + (pv1 >>> 0) + carryEq;
        carryEq = t1 > 0xffffffff ? 1 : 0;
        let xh1 = ((t1 >>> 0) ^ pv1) | eq1;
        let ph1 = mv1 | ~(xh1 | pv1);
        let mh1 = pv1 & xh1;
        const carryPh1 = (ph1 >>> 31) & 1;
        const carryMh1 = (mh1 >>> 31) & 1;

        let eq2 = peq2[ch];
        const xv2 = eq2 | mv2;
        let t2 = ((eq2 & pv2) >>> 0) + (pv2 >>> 0) + carryEq;
        carryEq = t2 > 0xffffffff ? 1 : 0;
        let xh2 = ((t2 >>> 0) ^ pv2) | eq2;
        let ph2 = mv2 | ~(xh2 | pv2);
        let mh2 = pv2 & xh2;
        const carryPh2 = (ph2 >>> 31) & 1;
        const carryMh2 = (mh2 >>> 31) & 1;

        let eq3 = peq3[ch];
        const xv3 = eq3 | mv3;
        let t3 = ((eq3 & pv3) >>> 0) + (pv3 >>> 0) + carryEq;
        let xh3 = ((t3 >>> 0) ^ pv3) | eq3;
        let ph3 = mv3 | ~(xh3 | pv3);
        let mh3 = pv3 & xh3;

        if (scoreLane0) {
            score += (ph0 >>> shift) & 1;
            score -= (mh0 >>> shift) & 1;
        } else if (scoreLane1) {
            score += (ph1 >>> shift) & 1;
            score -= (mh1 >>> shift) & 1;
        } else if (scoreLane2) {
            score += (ph2 >>> shift) & 1;
            score -= (mh2 >>> shift) & 1;
        } else {
            score += (ph3 >>> shift) & 1;
            score -= (mh3 >>> shift) & 1;
        }

        const carryPh3 = (ph3 >>> 31) & 1;
        const carryMh3 = (mh3 >>> 31) & 1;

        ph0 = (ph0 << 1) | pb;
        mh0 = (mh0 << 1) | mb;
        pv0 = mh0 | ~(xv0 | ph0);
        mv0 = ph0 & xv0;

        ph1 = (ph1 << 1) | carryPh0;
        mh1 = (mh1 << 1) | carryMh0;
        pv1 = mh1 | ~(xv1 | ph1);
        mv1 = ph1 & xv1;

        ph2 = (ph2 << 1) | carryPh1;
        mh2 = (mh2 << 1) | carryMh1;
        pv2 = mh2 | ~(xv2 | ph2);
        mv2 = ph2 & xv2;

        ph3 = (ph3 << 1) | carryPh2;
        mh3 = (mh3 << 1) | carryMh2;
        pv3 = mh3 | ~(xv3 | ph3);
        mv3 = ph3 & xv3;

        phc[idx] ^= (carryPh3 ^ pb) << bit;
        mhc[idx] ^= (carryMh3 ^ mb) << bit;
    }

    for (let k = start; k < e0; k++) peq0[b.charCodeAt(k)] = 0;
    for (let k = s1; k < e1; k++) peq1[b.charCodeAt(k)] = 0;
    for (let k = s2; k < e2; k++) peq2[b.charCodeAt(k)] = 0;
    for (let k = s3; k < end; k++) peq3[b.charCodeAt(k)] = 0;

    return score;
}
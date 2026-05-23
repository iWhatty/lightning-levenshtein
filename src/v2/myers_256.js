// bench/bolt/myers_256.js
"use strict";

const peq0 = new Uint32Array(65536);
const peq1 = new Uint32Array(65536);
const peq2 = new Uint32Array(65536);
const peq3 = new Uint32Array(65536);
const peq4 = new Uint32Array(65536);
const peq5 = new Uint32Array(65536);
const peq6 = new Uint32Array(65536);
const peq7 = new Uint32Array(65536);

/**
 * Specialized 8-word Myers for 225..256 char patterns.
 * Assumes a.length >= b.length.
 *
 * a = longer string / pattern
 * b = shorter string / text
 */
export function myers_256(a1, b1) {

    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    let pv0 = -1, mv0 = 0;
    let pv1 = -1, mv1 = 0;
    let pv2 = -1, mv2 = 0;
    let pv3 = -1, mv3 = 0;
    let pv4 = -1, mv4 = 0;
    let pv5 = -1, mv5 = 0;
    let pv6 = -1, mv6 = 0;
    let pv7 = -1, mv7 = 0;

    let score = n;
    let i = 0;

    // Build PEQ
    for (; i < 32; i++) {
        peq0[a.charCodeAt(i)] |= (1 << i);
    }
    for (; i < 64; i++) {
        peq1[a.charCodeAt(i)] |= (1 << (i - 32));
    }
    for (; i < 96; i++) {
        peq2[a.charCodeAt(i)] |= (1 << (i - 64));
    }
    for (; i < 128; i++) {
        peq3[a.charCodeAt(i)] |= (1 << (i - 96));
    }
    for (; i < 160; i++) {
        peq4[a.charCodeAt(i)] |= (1 << (i - 128));
    }
    for (; i < 192; i++) {
        peq5[a.charCodeAt(i)] |= (1 << (i - 160));
    }
    for (; i < 224; i++) {
        peq6[a.charCodeAt(i)] |= (1 << (i - 192));
    }
    for (; i < n; i++) {
        peq7[a.charCodeAt(i)] |= (1 << (i - 224));
    }

    const lastIndex = n - 1;
    const lastWord = lastIndex >>> 5;
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

        if (lastWord === 0) {
            if (ph0 & lastMask) score++;
            if (mh0 & lastMask) score--;
        }

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

        if (lastWord === 1) {
            if (ph1 & lastMask) score++;
            if (mh1 & lastMask) score--;
        }

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

        if (lastWord === 2) {
            if (ph2 & lastMask) score++;
            if (mh2 & lastMask) score--;
        }

        ph2 = (ph2 << 1) | carryPh1;
        mh2 = (mh2 << 1) | carryMh1;

        pv2 = mh2 | ~(xv2 | ph2);
        mv2 = ph2 & xv2;

        // ---- word 3 ----
        let eq3 = peq3[ch];
        const xv3 = eq3 | mv3;
        let t3 = ((eq3 & pv3) >>> 0) + (pv3 >>> 0) + carryEq;
        carryEq = t3 > 0xffffffff ? 1 : 0;
        let xh3 = ((t3 >>> 0) ^ pv3) | eq3;
        let ph3 = mv3 | ~(xh3 | pv3);
        let mh3 = pv3 & xh3;

        const carryPh3 = (ph3 >>> 31) & 1;
        const carryMh3 = (mh3 >>> 31) & 1;

        if (lastWord === 3) {
            if (ph3 & lastMask) score++;
            if (mh3 & lastMask) score--;
        }

        ph3 = (ph3 << 1) | carryPh2;
        mh3 = (mh3 << 1) | carryMh2;

        pv3 = mh3 | ~(xv3 | ph3);
        mv3 = ph3 & xv3;

        // ---- word 4 ----
        let eq4 = peq4[ch];
        const xv4 = eq4 | mv4;
        let t4 = ((eq4 & pv4) >>> 0) + (pv4 >>> 0) + carryEq;
        carryEq = t4 > 0xffffffff ? 1 : 0;
        let xh4 = ((t4 >>> 0) ^ pv4) | eq4;
        let ph4 = mv4 | ~(xh4 | pv4);
        let mh4 = pv4 & xh4;

        const carryPh4 = (ph4 >>> 31) & 1;
        const carryMh4 = (mh4 >>> 31) & 1;

        if (lastWord === 4) {
            if (ph4 & lastMask) score++;
            if (mh4 & lastMask) score--;
        }

        ph4 = (ph4 << 1) | carryPh3;
        mh4 = (mh4 << 1) | carryMh3;

        pv4 = mh4 | ~(xv4 | ph4);
        mv4 = ph4 & xv4;

        // ---- word 5 ----
        let eq5 = peq5[ch];
        const xv5 = eq5 | mv5;
        let t5 = ((eq5 & pv5) >>> 0) + (pv5 >>> 0) + carryEq;
        carryEq = t5 > 0xffffffff ? 1 : 0;
        let xh5 = ((t5 >>> 0) ^ pv5) | eq5;
        let ph5 = mv5 | ~(xh5 | pv5);
        let mh5 = pv5 & xh5;

        const carryPh5 = (ph5 >>> 31) & 1;
        const carryMh5 = (mh5 >>> 31) & 1;

        if (lastWord === 5) {
            if (ph5 & lastMask) score++;
            if (mh5 & lastMask) score--;
        }

        ph5 = (ph5 << 1) | carryPh4;
        mh5 = (mh5 << 1) | carryMh4;

        pv5 = mh5 | ~(xv5 | ph5);
        mv5 = ph5 & xv5;

        // ---- word 6 ----
        let eq6 = peq6[ch];
        const xv6 = eq6 | mv6;
        let t6 = ((eq6 & pv6) >>> 0) + (pv6 >>> 0) + carryEq;
        carryEq = t6 > 0xffffffff ? 1 : 0;
        let xh6 = ((t6 >>> 0) ^ pv6) | eq6;
        let ph6 = mv6 | ~(xh6 | pv6);
        let mh6 = pv6 & xh6;

        const carryPh6 = (ph6 >>> 31) & 1;
        const carryMh6 = (mh6 >>> 31) & 1;

        if (lastWord === 6) {
            if (ph6 & lastMask) score++;
            if (mh6 & lastMask) score--;
        }

        ph6 = (ph6 << 1) | carryPh5;
        mh6 = (mh6 << 1) | carryMh5;

        pv6 = mh6 | ~(xv6 | ph6);
        mv6 = ph6 & xv6;

        // ---- word 7 ----
        let eq7 = peq7[ch];
        const xv7 = eq7 | mv7;
        let t7 = ((eq7 & pv7) >>> 0) + (pv7 >>> 0) + carryEq;
        let xh7 = ((t7 >>> 0) ^ pv7) | eq7;
        let ph7 = mv7 | ~(xh7 | pv7);
        let mh7 = pv7 & xh7;

        if (lastWord === 7) {
            if (ph7 & lastMask) score++;
            if (mh7 & lastMask) score--;
        }

        ph7 = (ph7 << 1) | carryPh6;
        mh7 = (mh7 << 1) | carryMh6;

        pv7 = mh7 | ~(xv7 | ph7);
        mv7 = ph7 & xv7;
    }

    // Clear PEQ 256
    i = 0;
    for (; i < 32; i++) {
        peq0[a.charCodeAt(i)] = 0;
        peq1[a.charCodeAt(i + 32)] = 0;
        peq2[a.charCodeAt(i + 64)] = 0;
        peq3[a.charCodeAt(i + 96)] = 0;
        peq4[a.charCodeAt(i + 128)] = 0;
        peq5[a.charCodeAt(i + 160)] = 0;
        peq6[a.charCodeAt(i + 192)] = 0;
    }
    for (i = 224; i < n; i++) {
        peq7[a.charCodeAt(i)] = 0;
    }

    return score;
}



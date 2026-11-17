// ./src/myers_x_factory.js

"use strict";

/**
 * Creates a blockwise Myers kernel bound to a specific PEQ table.
 *
 * Scratch buffers are scoped to the returned function so different entrypoints
 * can run with different PEQ widths without sharing mutable state.
 *
 * @param {Uint32Array} peq - Pattern equality table.
 * @returns {(a1: string, b1: string) => number}
 */
export function createMyersX(peq) {
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

  return function myers_x_bound(a1, b1) {
    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    const hsize = (n + 31) >> 5;
    const vsize = (m + 31) >> 5;

    ensureScratch(hsize);
    const phc = phcBuf;
    const mhc = mhcBuf;

    let pv = -1, mv = 0;
    const start = (vsize - 1) * 32;
    const end = start + Math.min(32, m - start);
    const shift = end - start - 1;

    for (let j = 0; j < vsize - 1; j++) {
      let pv = -1, mv = 0;
      const start = j * 32;
      const end = Math.min(start + 32, m);

      for (let k = start; k < end; k++) {
        peq[b.charCodeAt(k)] |= 1 << (k - start);
      }

      for (let i = 0; i < n; i++) {
        const ch = a.charCodeAt(i);
        const eq = peq[ch];
        const idx = i >> 5;
        const bit = i & 31;
        const pb = (phc[idx] >>> bit) & 1;
        const mb = (mhc[idx] >>> bit) & 1;

        const xv = eq | mv;
        const xh = ((((eq | mb) & pv) + pv) ^ pv) | eq | mb;

        let ph = mv | ~(xh | pv);
        let mh = pv & xh;

        phc[idx] ^= ((ph >>> 31) ^ pb) << bit;
        mhc[idx] ^= ((mh >>> 31) ^ mb) << bit;

        ph = (ph << 1) | pb;
        mh = (mh << 1) | mb;
        pv = mh | ~(xv | ph);
        mv = ph & xv;
      }

      for (let k = start; k < end; k++) {
        peq[b.charCodeAt(k)] = 0;
      }
    }

    for (let k = start; k < end; k++) {
      peq[b.charCodeAt(k)] |= 1 << (k - start);
    }

    let score = m;
    for (let i = 0; i < n; i++) {
      const ch = a.charCodeAt(i);
      const eq = peq[ch];
      const idx = i >> 5;
      const bit = i & 31;
      const pb = (phc[idx] >>> bit) & 1;
      const mb = (mhc[idx] >>> bit) & 1;

      const xv = eq | mv;
      const xh = ((((eq | mb) & pv) + pv) ^ pv) | eq | mb;

      let ph = mv | ~(xh | pv);
      let mh = pv & xh;

      score += ((ph >>> shift) & 1);
      score -= ((mh >>> shift) & 1);

      phc[idx] ^= ((ph >>> 31) ^ pb) << bit;
      mhc[idx] ^= ((mh >>> 31) ^ mb) << bit;

      ph = (ph << 1) | pb;
      mh = (mh << 1) | mb;
      pv = mh | ~(xv | ph);
      mv = ph & xv;
    }

    for (let k = start; k < end; k++) {
      peq[b.charCodeAt(k)] = 0;
    }

    return score;
  };
}

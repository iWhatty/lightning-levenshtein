
// ./src/myers_x_max.js

import { peq } from './peq.js';

/**
 * Computes the edit distance between strings `a` and `b` using the Myers bit-parallel algorithm
 * with an early-exit threshold. Optimized for scenarios where differences above `maxDistance`
 * can be ignored.
 *
 * @param {string} a1 - The query string.
 * @param {string} b1 - The reference string.
 * @param {number} maxDistance - Maximum acceptable edit distance; exits early if exceeded.
 * @returns {number} Exact distance within the threshold, otherwise a value above it.
 */
export function myers_x_max(a1, b1, maxDistance) {

  const a = a1;
  const b = b1;
  const n = a.length;
  const m = b.length;

  let hsize = Math.ceil(n / 32);           // Horizontal bitvector chunks
  const vsize = Math.ceil(m / 32);         // Vertical chunks from `b`

  const mhc = new Array(hsize);
  const phc = new Array(hsize);
  while (hsize--) {
    phc[hsize] = -1; // Initialize with all 1s (positive history)
    mhc[hsize] = 0;  // Initialize with all 0s (negative history)
  }

  let j = 0;
  for (; j < vsize - 1; j++) {
    let pv = -1, mv = 0;
    const start = j * 32;
    const end = Math.min(start + 32, m);

    // Initialize bitmask for current block of `b`
    for (let k = start; k < end; k++) {
      peq[b.charCodeAt(k)] |= 1 << (k - start);
    }

    // Process block against all characters in `a`
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

    // Clear peq block before moving to next
    for (let k = start; k < end; k++) {
      peq[b.charCodeAt(k)] = 0;
    }
  }

  // Final block
  let pv = -1, mv = 0;
  const start = j * 32;
  const end = Math.min(start + 32, m);
  const shift = end - start - 1;

  for (let k = start; k < end; k++) {
    peq[b.charCodeAt(k)] |= 1 << (k - start);
  }

  let score = m;
  maxDistance += n; // Adjust threshold to accommodate max iterations

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

    // Update score from the last live bit in the final block.
    score += ((ph >>> shift) & 1);
    score -= ((mh >>> shift) & 1);

    // Early termination if score exceeds threshold
    if (score > maxDistance--) break;

    phc[idx] ^= ((ph >>> 31) ^ pb) << bit;
    mhc[idx] ^= ((mh >>> 31) ^ mb) << bit;

    ph = (ph << 1) | pb;
    mh = (mh << 1) | mb;
    pv = mh | ~(xv | ph);
    mv = ph & xv;
  }

  // Final peq cleanup
  for (let k = start; k < end; k++) {
    peq[b.charCodeAt(k)] = 0;
  }

  return score;
};

// ./src/myers_32_factory.js

"use strict";

/**
 * Creates a 32-bit Myers kernel bound to a specific PEQ table.
 *
 * The table choice happens before callers enter the hot path, so the inner
 * loop stays branch-free while ASCII and Unicode entrypoints can share the
 * same implementation.
 *
 * @param {Uint32Array} peq - Pattern equality table.
 * @returns {(a1: string, b1: string) => number}
 */
export function createMyers32(peq) {
  return function myers_32_bound(a1, b1) {
    const a = a1;
    const b = b1;
    const n = a.length;
    const m = b.length;

    const lastMask = 1 << (n - 1);

    let mv = 0;
    let pv = -1;
    let score = n;

    let i = n;
    while (i--) {
      peq[a.charCodeAt(i)] |= 1 << i;
    }

    for (i = 0; i < m; i++) {
      const eq = peq[b.charCodeAt(i)];

      const xv = eq | mv;
      const eqv = eq | (((eq & pv) + pv) ^ pv);
      const nh = ~(eqv | pv);
      const ph = mv | nh;
      const mh = pv & eqv;

      score += ((ph & lastMask) !== 0) - ((mh & lastMask) !== 0);

      const newMv = (ph << 1) | 1;
      const newPv = (mh << 1) | ~(xv | newMv);

      pv = newPv;
      mv = newMv & xv;
    }

    i = n;
    while (i--) {
      peq[a.charCodeAt(i)] = 0;
    }

    return score;
  };
}

//  src/v2/index.js
//
//  Lightning Levenshtein v2 — length-dispatching wrapper around the
//  bit-parallel Myers kernels in this directory. Resolved at consumer
//  bundle time when importing from `lightning-levenshtein/v2` under the
//  `import` condition; pre-built blob via `default` and `./v2/min`.
"use strict";

import { myers_table } from './myers32-unrolledA.js';
import { myers_64 } from './myers_64.js';
import { myers_96 } from './myers_96.js';
import { myers_128 } from './myers_128.js';
import { myers_256 } from './myers_256.js';
import { myers_x64 } from './myers_x64.js';
import { myers_x128 } from './myers_x128.js';

/** Smart dispatcher strategy by input length */
const strategy = myers_table;

/**
 * Unified Lightning Levenshtein v2
 * - Fast dispatch for small lengths
 * - Fully unrolled bit-parallel for midrange
 * - Correct and memory-safe for all input lengths
 */
export function levenshteinLightning(a, b) {
  if (a === b) return 0;

  // Deliberately avoid destructuring swap here.
  // Plain temp swap benchmarks faster in the hot path.
  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;

  if (m === 0) return n;

  if (n < 2) return +(a !== b);

  if (n < 3) {
    if (m > 1) {
      return (a.charCodeAt(0) !== b.charCodeAt(0)) + (a.charCodeAt(1) !== b.charCodeAt(1));
    }
    if (m > 0) {
      const b0 = b.charCodeAt(0);
      const a0 = a.charCodeAt(0);
      const a1 = a.charCodeAt(1);
      return (a0 === b0 || a1 === b0) ? 1 : 2;
    }
    return 2;
  }

  if (n < 33) return strategy[n](a, b);

  if (n < 65) return myers_64(a, b);

  if (n < 97) return myers_96(a, b);

  if (n < 129) return myers_128(a, b);

  if (n < 225) return myers_x64(a, b);

  if (n < 257) return myers_256(a, b);

  if (n < 513) return myers_x64(a, b);

  return myers_x128(a, b);
}

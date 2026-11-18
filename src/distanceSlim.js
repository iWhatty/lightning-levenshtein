// ./src/distanceSlim.js

"use strict";

import { myers_table, peq } from './myers_32_unrolled16.js';
import { createMyers32 } from './myers_32_factory.js';
import { createMyersX } from './myers_x_factory.js';

// Every tier binds the one full-width table the unrolled kernels export.
// Calls are synchronous and each kernel clears what it set, so the tiers take
// turns on 256 KiB instead of owning private lanes.
const myers_32 = createMyers32(peq);
const myers_x = createMyersX(peq);

/**
 * Computes Levenshtein distance in UTF-16 code units with one shared
 * full-width PEQ table: v2's unrolled kernels up to 16 code units, the stable
 * 32-bit kernel up to 32, and the stable blockwise kernel beyond.
 *
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} The UTF-16 code-unit Levenshtein distance.
 */
export function distanceSlim(a, b) {
  // A throw inside a kernel would leave the shared table dirty for every
  // later call, so reject non-strings before one runs.
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('distanceSlim: both arguments must be strings');
  }

  if (a === b) return 0;

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
    const b0 = b.charCodeAt(0);
    return (a.charCodeAt(0) === b0 || a.charCodeAt(1) === b0) ? 1 : 2;
  }

  if (n < 17) return myers_table[n](a, b);
  if (n < 33) return myers_32(a, b);
  return myers_x(a, b);
}

//  ./src/distance.js
"use strict";

import { myers_32 } from './myers_32.js';
import { myers_x } from './myers_x.js';
import { myers_x64 } from './myers_x64.js';
/**
 * Computes the Levenshtein edit distance between two strings using the fastest available algorithm.
 * Automatically selects an optimized Myers variant based on input length.
 *
 * @param {string} a - First string (longer string will be assigned to `a` for optimization).
 * @param {string} b - Second string to compare.
 * @returns {number} The Levenshtein distance between `a` and `b`.
 */
export function distance(a, b) {
  // Kernels write into shared PEQ tables and clear them on return. A throw
  // midway would leave them dirty for every later call, so reject anything
  // that is not a primitive string before a kernel runs.
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('distance: both arguments must be strings');
  }

  // Fast path: identical strings
  if (a === b) return 0;

  // Always process with the longer string as `a` for bitmask consistency
  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;


  // Handle empty string edge cases
  if (m === 0) return n;

  // Algorithm dispatch based on input length
  if (n < 33) {
    // Use optimized 32-bit Myers for short strings
    return myers_32(a, b);
  } else if (n < 65) {
    // Use blockwise Myers for longer strings
    return myers_x(a, b);
  } else {
    return myers_x64(a, b);
  }
};

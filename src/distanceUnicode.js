// ./src/distanceUnicode.js

"use strict";

import { myers_32_unicode } from './myers_32_unicode.js';
import { myers_x_unicode } from './myers_x_unicode.js';
import { myers_x64 } from './myers_x64.js';

/**
 * Computes Levenshtein distance with full UTF-16 code-unit PEQ tables.
 *
 * This explicit path avoids adding per-call Unicode routing to the default
 * low-memory hot path.
 *
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} The UTF-16 code-unit Levenshtein distance.
 */
export function distanceUnicode(a, b) {
  if (a === b) return 0;

  if (a.length < b.length) {
    const t = a;
    a = b;
    b = t;
  }

  const n = a.length;
  const m = b.length;

  if (m === 0) return n;

  if (n < 33) return myers_32_unicode(a, b);
  if (n < 65) return myers_x_unicode(a, b);

  return myers_x64(a, b);
}

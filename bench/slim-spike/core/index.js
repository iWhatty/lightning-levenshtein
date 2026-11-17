// bench/slim-spike/index.js
//
// Slim dispatcher: v2 speed on short strings with one full-width table.
//   n < 3     v2's closed-form shortcuts
//   n <= 16   v2's unrolled per-length kernels
//   n <= 32   the stable generic 32-bit kernel
//   n > 32    the stable blockwise kernel
// Every tier binds the same 65,536-entry table. Calls are synchronous and each
// kernel clears what it set, so one table serves them all (256 KiB in total).
"use strict";

import { myers_table, peq } from "./myers32-unrolled16.js";
import { createMyers32 } from "./myers_32_factory.js";
import { createMyersX } from "./myers_x_factory.js";

const myers_32 = createMyers32(peq);
const myers_x = createMyersX(peq);

/**
 * Levenshtein distance between two strings, counted in UTF-16 code units.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function distance(a, b) {
  // A throw inside a kernel would leave the shared table dirty for every
  // later call, so reject non-strings before one runs.
  if (typeof a !== "string" || typeof b !== "string") {
    throw new TypeError("distance: both arguments must be strings");
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

export { peq };

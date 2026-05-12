// bench/small-dispatch-spike/levenshtein-v2-direct3.js

"use strict";

import { myers_table } from "../bolt/myers32-unrolledA.js";
import { lev3_dispatch } from "../bolt/lev-dispatch.js";
import { myers_64 } from "../bolt/myers_64.js";
import { myers_96 } from "../bolt/myers_96.js";
import { myers_128 } from "../bolt/myers_128.js";
import { myers_256 } from "../bolt/myers_256.js";
import { myers_x64 } from "../bolt/myers_x64.js";
import { myers_x128 } from "../bolt/myers_x128.js";

const strategy = myers_table;

export function levenshteinLightningDirect3(a, b) {
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
    if (m > 0) {
      const b0 = b.charCodeAt(0);
      const a0 = a.charCodeAt(0);
      const a1 = a.charCodeAt(1);
      return (a0 === b0 || a1 === b0) ? 1 : 2;
    }
    return 2;
  }

  if (n < 4) return lev3_dispatch(a, b);
  if (n < 33) return strategy[n](a, b);
  if (n < 65) return myers_64(a, b);
  if (n < 97) return myers_96(a, b);
  if (n < 129) return myers_128(a, b);
  if (n < 225) return myers_x64(a, b);
  if (n < 257) return myers_256(a, b);
  if (n < 513) return myers_x64(a, b);

  return myers_x128(a, b);
}

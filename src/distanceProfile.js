"use strict";

import { createMyers32 } from "./myers_32_factory.js";
import { createMyersX } from "./myers_x_factory.js";
import { createMyersX64 } from "./myers_x64_factory.js";

const PROFILE_WIDTHS = {
  "ascii": 128,
  "latin1": 256,
  "codeUnit": 65536
};

/**
 * Creates an isolated, table-bound Levenshtein distance function.
 *
 * @param {{profile: "ascii"|"latin1"|"codeUnit", outOfRange?: "throw"|"assume-valid"}} options
 * @returns {(a: string, b: string) => number}
 */
export function createDistance(options) {
  // Quoted public keys must survive Closure ADVANCED property renaming.
  const profile = options?.["profile"];
  const outOfRange = options?.["outOfRange"] ?? "throw";
  const width = PROFILE_WIDTHS[profile];

  if (width === undefined) {
    throw new TypeError(`Unknown text profile: ${String(profile)}`);
  }
  if (outOfRange !== "throw" && outOfRange !== "assume-valid") {
    throw new TypeError(`Unknown out-of-range policy: ${String(outOfRange)}`);
  }

  // Short and blockwise calls never overlap, so they can share one PEQ table.
  const peq = new Uint32Array(width);
  const myers32 = createMyers32(peq);
  const myersX = createMyersX(peq);
  const myersX64 = createMyersX64(
    new Uint32Array(width),
    new Uint32Array(width)
  );

  const dispatch = (a, b) => {
    if (a === b) return 0;

    if (a.length < b.length) {
      const temporary = a;
      a = b;
      b = temporary;
    }

    const length = a.length;
    if (b.length === 0) return length;
    if (length < 33) return myers32(a, b);
    if (length < 65) return myersX(a, b);
    return myersX64(a, b);
  };

  if (outOfRange === "assume-valid" || width === 65536) return dispatch;

  return (a, b) => {
    assertInProfile(a, width, profile, "first");
    assertInProfile(b, width, profile, "second");
    return dispatch(a, b);
  };
}

function assertInProfile(value, width, profile, label) {
  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= width) {
      throw new RangeError(
        `${label} string contains code unit ${codeUnit} at index ${index}, outside the ${profile} profile`
      );
    }
  }
}

// bench/shared-peq-spike/peqPool.js
//
// One set of full code-unit PEQ lanes shared by every pooled v2 kernel.
// Invariant: every lane is all-zero between public calls. Kernels are
// synchronous and clear what they set, so calls never overlap in the pool.
"use strict";

export const peq0 = new Uint32Array(65536);
export const peq1 = new Uint32Array(65536);
export const peq2 = new Uint32Array(65536);
export const peq3 = new Uint32Array(65536);
export const peq4 = new Uint32Array(65536);
export const peq5 = new Uint32Array(65536);
export const peq6 = new Uint32Array(65536);
export const peq7 = new Uint32Array(65536);

export const lanes = [peq0, peq1, peq2, peq3, peq4, peq5, peq6, peq7];

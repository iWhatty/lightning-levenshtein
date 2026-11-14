// Derived by bench/default-wide-spike/derive-core.js. Do not edit.
//
// Two full-width UTF-16 code-unit lanes shared by every default kernel. Calls
// are synchronous and each kernel zeroes what it wrote before returning, so
// the short, blockwise and long tiers can take turns on the same tables.
export const peq = new Uint32Array(0x10000);
export const peq1 = new Uint32Array(0x10000);

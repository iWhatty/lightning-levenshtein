// Auto-generated: Optimized Myers 32-bit variants with fixed A.length
// Source: codegen/tools/generateMyers32-A.cjs
export const peq = new Uint32Array(65536);
export const myers_table = [];

function myers_1(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 1;
  const lst = 1;
  peq[a.charCodeAt(0)] |= 1;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  return sc;
}
myers_table[1] = myers_1;

function myers_2(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 2;
  const lst = 2;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  return sc;
}
myers_table[2] = myers_2;

function myers_3(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 3;
  const lst = 4;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  return sc;
}
myers_table[3] = myers_3;

function myers_4(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 4;
  const lst = 8;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  return sc;
}
myers_table[4] = myers_4;

function myers_5(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 5;
  const lst = 16;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  return sc;
}
myers_table[5] = myers_5;

function myers_6(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 6;
  const lst = 32;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  return sc;
}
myers_table[6] = myers_6;

function myers_7(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 7;
  const lst = 64;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  return sc;
}
myers_table[7] = myers_7;

function myers_8(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 8;
  const lst = 128;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  return sc;
}
myers_table[8] = myers_8;

function myers_9(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 9;
  const lst = 256;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  return sc;
}
myers_table[9] = myers_9;

function myers_10(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 10;
  const lst = 512;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  return sc;
}
myers_table[10] = myers_10;

function myers_11(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 11;
  const lst = 1024;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  return sc;
}
myers_table[11] = myers_11;

function myers_12(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 12;
  const lst = 2048;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  peq[a.charCodeAt(11)] |= 2048;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  peq[a.charCodeAt(11)] = 0;
  return sc;
}
myers_table[12] = myers_12;

function myers_13(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 13;
  const lst = 4096;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  peq[a.charCodeAt(11)] |= 2048;
  peq[a.charCodeAt(12)] |= 4096;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  peq[a.charCodeAt(11)] = 0;
  peq[a.charCodeAt(12)] = 0;
  return sc;
}
myers_table[13] = myers_13;

function myers_14(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 14;
  const lst = 8192;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  peq[a.charCodeAt(11)] |= 2048;
  peq[a.charCodeAt(12)] |= 4096;
  peq[a.charCodeAt(13)] |= 8192;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  peq[a.charCodeAt(11)] = 0;
  peq[a.charCodeAt(12)] = 0;
  peq[a.charCodeAt(13)] = 0;
  return sc;
}
myers_table[14] = myers_14;

function myers_15(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 15;
  const lst = 16384;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  peq[a.charCodeAt(11)] |= 2048;
  peq[a.charCodeAt(12)] |= 4096;
  peq[a.charCodeAt(13)] |= 8192;
  peq[a.charCodeAt(14)] |= 16384;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  peq[a.charCodeAt(11)] = 0;
  peq[a.charCodeAt(12)] = 0;
  peq[a.charCodeAt(13)] = 0;
  peq[a.charCodeAt(14)] = 0;
  return sc;
}
myers_table[15] = myers_15;

function myers_16(a, b) {
  const m = b.length;
  let mv = 0;
  let pv = -1;
  let sc = 16;
  const lst = 32768;
  peq[a.charCodeAt(0)] |= 1;
  peq[a.charCodeAt(1)] |= 2;
  peq[a.charCodeAt(2)] |= 4;
  peq[a.charCodeAt(3)] |= 8;
  peq[a.charCodeAt(4)] |= 16;
  peq[a.charCodeAt(5)] |= 32;
  peq[a.charCodeAt(6)] |= 64;
  peq[a.charCodeAt(7)] |= 128;
  peq[a.charCodeAt(8)] |= 256;
  peq[a.charCodeAt(9)] |= 512;
  peq[a.charCodeAt(10)] |= 1024;
  peq[a.charCodeAt(11)] |= 2048;
  peq[a.charCodeAt(12)] |= 4096;
  peq[a.charCodeAt(13)] |= 8192;
  peq[a.charCodeAt(14)] |= 16384;
  peq[a.charCodeAt(15)] |= 32768;
  for (let i = 0; i < m; i++) {
    const bCode = b.charCodeAt(i);
    const eq = peq[bCode];
    const xv = eq | mv;
    const eqv = eq | (((eq & pv) + pv) ^ pv);
    const nh = ~(eqv | pv);
    const ph = mv | nh;
    const mh = pv & eqv;
    const phLst = ph & lst;
    const mhLst = mh & lst;
    sc += (phLst !== 0) - (mhLst !== 0);
    const newMv = (ph << 1) | 1;
    const newPv = (mh << 1) | ~(xv | newMv);
    pv = newPv;
    mv = newMv & xv;
  }
  peq[a.charCodeAt(0)] = 0;
  peq[a.charCodeAt(1)] = 0;
  peq[a.charCodeAt(2)] = 0;
  peq[a.charCodeAt(3)] = 0;
  peq[a.charCodeAt(4)] = 0;
  peq[a.charCodeAt(5)] = 0;
  peq[a.charCodeAt(6)] = 0;
  peq[a.charCodeAt(7)] = 0;
  peq[a.charCodeAt(8)] = 0;
  peq[a.charCodeAt(9)] = 0;
  peq[a.charCodeAt(10)] = 0;
  peq[a.charCodeAt(11)] = 0;
  peq[a.charCodeAt(12)] = 0;
  peq[a.charCodeAt(13)] = 0;
  peq[a.charCodeAt(14)] = 0;
  peq[a.charCodeAt(15)] = 0;
  return sc;
}
myers_table[16] = myers_16;

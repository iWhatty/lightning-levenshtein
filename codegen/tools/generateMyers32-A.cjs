// codegen\tools\generateMyers32-A.cjs

const path = require('path');
const { writeOrCheckGeneratedOutputs } = require('./generated-output.cjs');

// Emits the unrolled kernels for A.length 1..maxLength. `exportTable` exports
// the PEQ table so a dispatcher can bind its other tiers to the same lanes;
// `dispatcher` appends the standalone myers32_unrolledA entry.
function generate({ maxLength, exportTable, dispatcher }) {
const out = [];
out.push('// Auto-generated: Optimized Myers 32-bit variants with fixed A.length');
out.push('// Source: codegen/tools/generateMyers32-A.cjs');
out.push(`${exportTable ? 'export ' : ''}const peq = new Uint32Array(65536);`);
out.push('export const myers_table = [];');

for (let n = 1; n <= maxLength; n++) {
  const lastMask = 1 << (n - 1);

  out.push('');
  out.push(`function myers_${n}(a, b) {`);
  out.push(`  const m = b.length;`);
  out.push(`  let mv = 0;`);
  out.push(`  let pv = -1;`);
  out.push(`  let sc = ${n};`);
  out.push(`  const lst = ${lastMask};`);

  // Setup peq (fixed A-length unrolled)
  for (let i = 0; i < n; i++) {
    out.push(`  peq[a.charCodeAt(${i})] |= ${1 << i};`);
  }

  // Main loop using v4 kernel
  out.push(`  for (let i = 0; i < m; i++) {`);
  out.push(`    const bCode = b.charCodeAt(i);`);
  out.push(`    const eq = peq[bCode];`);
  out.push(`    const xv = eq | mv;`);
  out.push(`    const eqv = eq | (((eq & pv) + pv) ^ pv);`);
  out.push(`    const nh = ~(eqv | pv);`);
  out.push(`    const ph = mv | nh;`);
  out.push(`    const mh = pv & eqv;`);
  out.push(`    const phLst = ph & lst;`);
  out.push(`    const mhLst = mh & lst;`);
  out.push(`    sc += (phLst !== 0) - (mhLst !== 0);`);
  out.push(`    const newMv = (ph << 1) | 1;`);
  out.push(`    const newPv = (mh << 1) | ~(xv | newMv);`);
  out.push(`    pv = newPv;`);
  out.push(`    mv = newMv & xv;`);
  out.push(`  }`);

  // Cleanup peq
  for (let i = 0; i < n; i++) {
    out.push(`  peq[a.charCodeAt(${i})] = 0;`);
  }

  out.push(`  return sc;`);
  out.push(`}`);
  out.push(`myers_table[${n}] = myers_${n};`);
}

if (dispatcher) {
  out.push('');
  out.push('export function myers32_unrolledA(a, b) {');
  out.push('  const fn = myers_table[a.length];');
  out.push('  return fn ? fn(a, b) : null;');
  out.push('}');
}
out.push('');

return out.join('\n');
}

const check = process.argv.includes('--check');

writeOrCheckGeneratedOutputs({
  generated: generate({ maxLength: 32, exportTable: false, dispatcher: true }),
  outputPaths: [
    path.resolve(__dirname, '..', 'artifacts', 'myers32-unrolledA.js'),
    path.resolve(__dirname, '..', '..', 'src', 'v2', 'myers32-unrolledA.js')
  ],
  label: 'Myers32 A',
  refreshCommand: 'pnpm run codegen:myers32:a',
  check,
});

// The /slim entry unrolls only the lengths most words fit in, and binds its
// generic 32-bit and blockwise tiers to the exported table.
writeOrCheckGeneratedOutputs({
  generated: generate({ maxLength: 16, exportTable: true, dispatcher: false }),
  outputPaths: [path.resolve(__dirname, '..', '..', 'src', 'myers_32_unrolled16.js')],
  label: 'Myers32 A slim',
  refreshCommand: 'pnpm run codegen:myers32:a',
  check,
});

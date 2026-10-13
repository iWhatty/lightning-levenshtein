# Generated Myers32 Artifacts

Generated files are owned by scripts under `codegen/tools/`. Do not edit generated artifacts directly.

## Myers32 A

`generateMyers32-A.cjs` fixes the first argument length from 1 through 32. It owns both:

- `codegen/artifacts/myers32-unrolledA.js`, used for comparison work;
- `src/v2/myers32-unrolledA.js`, used by the production `/v2` dispatcher.

Refresh with `pnpm run codegen:myers32:a`.

## Myers32 B

`generateMyers32-B.cjs` fixes the second argument length from 1 through 32. It owns only `codegen/artifacts/myers32-unrolledB.js` and remains experimental. Both arguments must contain 1 through 32 UTF-16 code units; its dispatcher returns `null` outside that domain.

Refresh with `pnpm run codegen:myers32:b`.

## Verification

Run `pnpm run codegen:check` to compare every owned output with freshly generated text without modifying files. The full local release gate runs this check before builds and tests.

Refreshes stage complete output files before replacing the owned paths. Staging failures leave the old bytes untouched, and handled replacement failures trigger rollback. If rollback fails, the error names any retained recovery copy. The generator assumes one writer. An abrupt stop between the two Myers32 A replacements may leave complete but mismatched files; `codegen:check` detects this, and rerunning the refresh repairs it.

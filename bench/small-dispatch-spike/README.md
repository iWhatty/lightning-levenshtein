# Small Dispatch Spike

This bench tests whether direct-matrix dispatch for tiny strings should return to the v2 runtime.

The current v2 runtime already has a hand-written length-2 path and then falls through to the generated Myers table for lengths 3-32. The older bench code still contains direct matrix kernels for length 3 and 4. This spike compares:

- current `levenshteinLightning`
- source `levenshteinLightning` from `src/v2/` as a bundling/JIT control
- `v2-inline-direct-3`, a v2-shaped runtime with only length 3 routed to `lev3_dispatch`
- `tiny-direct-3`, a wrapper that uses `lev3_dispatch` before falling back to current v2
- `tiny-direct-3-4`, a wrapper that uses `lev3_dispatch` and `lev4_dispatch` before falling back to current v2
- `fastest-levenshtein`

Promote only if the inline direct path wins clearly against the source-v2 control across repeated runs and stays correct against the reference. Early runs show length 3 is promising, while length 4 direct dispatch is not.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { BUNDLE_FILES, PUBLIC_EXPORTS } from "./package-contract.mjs";
import { assertPackageRuntime } from "./package-runtime-contract.mjs";

for (const bundle of BUNDLE_FILES) {
  assert.doesNotMatch(
    readFileSync(bundle, "utf8"),
    /globalThis/,
    `${bundle} leaked its temporary global export bridge`
  );
}

await assertPackageRuntime(PUBLIC_EXPORTS);

console.log("package exports smoke check passed");

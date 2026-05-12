import assert from "node:assert/strict";

const root = await import("lightning-levenshtein");
const v2 = await import("lightning-levenshtein/v2");
const unicode = await import("lightning-levenshtein/unicode");

assert.deepEqual(Object.keys(root).sort(), [
  "closest",
  "distance",
  "distanceMax"
]);
assert.deepEqual(Object.keys(v2).sort(), ["levenshteinLightning"]);
assert.deepEqual(Object.keys(unicode).sort(), ["distanceUnicode"]);

assert.equal(root.distance("kitten", "sitting"), 3);
assert.equal(root.distanceMax("kitten", "sitting", 10), 3);
assert.equal(root.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(v2.levenshteinLightning("kitten", "sitting"), 3);

assert.equal(root.distance("\u4f60a", "\u4f60b"), 2);
assert.equal(unicode.distanceUnicode("\u4f60a", "\u4f60b"), 1);

console.log("package exports smoke check passed");

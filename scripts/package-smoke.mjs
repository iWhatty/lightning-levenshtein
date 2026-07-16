import assert from "node:assert/strict";

const root = await import("lightning-levenshtein");
const rootMin = await import("lightning-levenshtein/min");
const v2 = await import("lightning-levenshtein/v2");
const v2Min = await import("lightning-levenshtein/v2/min");
const unicode = await import("lightning-levenshtein/unicode");
const unicodeMin = await import("lightning-levenshtein/unicode/min");
const profiles = await import("lightning-levenshtein/profiles");
const profilesMin = await import("lightning-levenshtein/profiles/min");

assert.deepEqual(Object.keys(root).sort(), [
  "closest",
  "distance",
  "distanceMax"
]);
assert.deepEqual(Object.keys(rootMin).sort(), Object.keys(root).sort());
assert.deepEqual(Object.keys(v2).sort(), ["levenshteinLightning"]);
assert.deepEqual(Object.keys(v2Min).sort(), Object.keys(v2).sort());
assert.deepEqual(Object.keys(unicode).sort(), ["distanceUnicode"]);
assert.deepEqual(Object.keys(unicodeMin).sort(), Object.keys(unicode).sort());
assert.deepEqual(Object.keys(profiles).sort(), ["createDistance"]);
assert.deepEqual(Object.keys(profilesMin).sort(), Object.keys(profiles).sort());

assert.equal(root.distance("kitten", "sitting"), 3);
assert.equal(rootMin.distance("kitten", "sitting"), 3);
assert.equal(root.distanceMax("kitten", "sitting", 10), 3);
assert.equal(rootMin.distanceMax("kitten", "sitting", 10), 3);
assert.equal(root.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(rootMin.closest("sittin", ["kitten", "sitting", "bitten"]), "sitting");
assert.equal(v2.levenshteinLightning("kitten", "sitting"), 3);
assert.equal(v2Min.levenshteinLightning("kitten", "sitting"), 3);

assert.equal(root.distance("\u4f60a", "\u4f60b"), 2);
assert.equal(unicode.distanceUnicode("\u4f60a", "\u4f60b"), 1);
assert.equal(unicodeMin.distanceUnicode("\u4f60a", "\u4f60b"), 1);

const ascii = profiles.createDistance({ profile: "ascii" });
const asciiMin = profilesMin.createDistance({ profile: "ascii" });
const asciiMinUnchecked = profilesMin.createDistance({
  profile: "ascii",
  outOfRange: "assume-valid"
});
assert.equal(ascii("kitten", "sitting"), 3);
assert.equal(asciiMin("kitten", "sitting"), 3);
assert.equal(asciiMinUnchecked("kitten", "sitting"), 3);
assert.throws(() => ascii("a\u0080", "a"), RangeError);
assert.throws(() => asciiMin("a\u0080", "a\u0080"), RangeError);

console.log("package exports smoke check passed");

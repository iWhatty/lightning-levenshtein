import assert from "node:assert/strict";

export async function assertPackageRuntime(publicExports) {
  const modules = Object.fromEntries(await Promise.all(publicExports.map(async (entry) => [
    entry.subpath,
    await import(entry.specifier),
  ])));

  for (const { subpath, names } of publicExports) {
    assert.deepEqual(
      Object.keys(modules[subpath]).sort(),
      [...names].sort(),
      `${subpath} exports drift`
    );
  }

  const root = modules["."];
  const rootMin = modules["./min"];
  const v2 = modules["./v2"];
  const v2Min = modules["./v2/min"];
  const unicode = modules["./unicode"];
  const unicodeMin = modules["./unicode/min"];
  const profiles = modules["./profiles"];
  const profilesMin = modules["./profiles/min"];

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
  for (const inheritedName of ["constructor", "toString", "__proto__"]) {
    assert.throws(
      () => profilesMin.createDistance({ profile: inheritedName }),
      { name: "TypeError", message: `Unknown text profile: ${inheritedName}` }
    );
  }
}

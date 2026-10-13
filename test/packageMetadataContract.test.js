import { assertPackageMetadata } from "../scripts/package-metadata-contract.mjs";

const metadata = Object.freeze({
  name: "example-package",
  legacyMain: "./dist/index.js",
  legacyModule: "./src/index.js",
  legacyBrowser: "./dist/index.js",
  type: "module",
  sideEffects: false,
  license: "SEE LICENSE IN LICENSE",
  publishAccess: "public",
  repositoryType: "git",
  repositoryUrl: "git+https://example.test/example-package.git",
  bugsUrl: "https://example.test/example-package/issues",
  homepage: "https://example.test/example-package#readme",
  nodeEngine: ">=18",
  rootTypes: "./dist/index.d.ts",
  prepublishOnly: "pnpm run check:ci",
});

function packageManifest() {
  return {
    name: metadata.name,
    version: "1.2.3",
    main: metadata.legacyMain,
    module: metadata.legacyModule,
    browser: metadata.legacyBrowser,
    type: metadata.type,
    sideEffects: metadata.sideEffects,
    license: metadata.license,
    publishConfig: { access: metadata.publishAccess },
    repository: {
      type: metadata.repositoryType,
      url: metadata.repositoryUrl,
    },
    bugs: { url: metadata.bugsUrl },
    homepage: metadata.homepage,
    engines: { node: metadata.nodeEngine },
    types: metadata.rootTypes,
    scripts: { prepublishOnly: metadata.prepublishOnly },
  };
}

describe("package metadata contract", () => {
  test("accepts the exact package metadata", () => {
    expect(() => assertPackageMetadata({
      pkg: packageManifest(),
      metadata,
      version: "1.2.3",
    })).not.toThrow();
  });

  test.each([
    ["name", (pkg) => { pkg.name = "other"; }],
    ["version", (pkg) => { pkg.version = "9.9.9"; }],
    ["main", (pkg) => { pkg.main = "./other.js"; }],
    ["module", (pkg) => { pkg.module = "./other.js"; }],
    ["browser", (pkg) => { pkg.browser = "./other.js"; }],
    ["sideEffects", (pkg) => { pkg.sideEffects = true; }],
    ["publishConfig.access", (pkg) => { pkg.publishConfig.access = "restricted"; }],
    ["repository.type", (pkg) => { pkg.repository.type = "svn"; }],
    ["repository.url", (pkg) => { pkg.repository.url = "https://example.test/other"; }],
    ["bugs.url", (pkg) => { pkg.bugs.url = "https://example.test/other/issues"; }],
    ["homepage", (pkg) => { delete pkg.homepage; }],
    ["scripts.prepublishOnly", (pkg) => { delete pkg.scripts.prepublishOnly; }],
  ])("labels %s drift", (field, mutate) => {
    const pkg = packageManifest();
    mutate(pkg);

    expect(() => assertPackageMetadata({
      pkg,
      metadata,
      version: "1.2.3",
    })).toThrow(`package metadata drift: ${field}`);
  });

  test("does not mutate caller-owned metadata", () => {
    const pkg = packageManifest();
    const before = JSON.stringify({ pkg, metadata });

    assertPackageMetadata({ pkg, metadata, version: "1.2.3" });

    expect(JSON.stringify({ pkg, metadata })).toBe(before);
  });
});

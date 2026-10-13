import assert from "node:assert/strict";

export function assertPackageMetadata({ pkg, metadata, version }) {
  const fields = [
    ["name", pkg?.name, metadata.name],
    ["main", pkg?.main, metadata.legacyMain],
    ["module", pkg?.module, metadata.legacyModule],
    ["browser", pkg?.browser, metadata.legacyBrowser],
    ["type", pkg?.type, metadata.type],
    ["sideEffects", pkg?.sideEffects, metadata.sideEffects],
    ["license", pkg?.license, metadata.license],
    ["publishConfig.access", pkg?.publishConfig?.access, metadata.publishAccess],
    ["repository.type", pkg?.repository?.type, metadata.repositoryType],
    ["repository.url", pkg?.repository?.url, metadata.repositoryUrl],
    ["bugs.url", pkg?.bugs?.url, metadata.bugsUrl],
    ["homepage", pkg?.homepage, metadata.homepage],
    ["engines.node", pkg?.engines?.node, metadata.nodeEngine],
    ["types", pkg?.types, metadata.rootTypes],
    ["scripts.prepublishOnly", pkg?.scripts?.prepublishOnly, metadata.prepublishOnly],
  ];

  if (version !== undefined) {
    fields.splice(1, 0, ["version", pkg?.version, version]);
  }

  for (const [field, actual, expected] of fields) {
    assert.equal(actual, expected, `package metadata drift: ${field}`);
  }
}

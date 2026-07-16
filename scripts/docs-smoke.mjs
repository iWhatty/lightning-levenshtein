import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const markdownFiles = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  ...readdirSync("docs")
    .filter((file) => file.endsWith(".md"))
    .map((file) => `docs/${file}`)
].sort();

const sourceRequired = [
  "docs/licensing-position.md",
  "docs/node-version-testing.md",
  "docs/use-cases-and-text-profiles.md"
];

let checkedLinks = 0;

for (const file of markdownFiles) {
  const markdown = readFileSync(file, "utf8");

  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const destination = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/i.test(destination)) continue;

    const path = decodeURIComponent(destination.split("#", 1)[0]);
    if (!path) continue;

    const target = resolve(dirname(file), path);
    assert.ok(existsSync(target), `${file} links to missing path: ${destination}`);
    checkedLinks += 1;
  }
}

for (const file of sourceRequired) {
  assert.match(
    readFileSync(file, "utf8"),
    /https:\/\//,
    `${file} must retain external source citations`
  );
}

console.log(
  `documentation smoke check passed (${markdownFiles.length} files, ${checkedLinks} local links, ${sourceRequired.length} source-backed docs)`
);

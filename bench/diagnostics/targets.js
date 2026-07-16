import { distance } from "../../src/distance.js";
import { distanceUnicode } from "../../src/distanceUnicode.js";
import { createDistance } from "../../src/profiles.js";
import { levenshteinLightning } from "../../src/v2/index.js";

const asciiThrow = createDistance({ profile: "ascii", outOfRange: "throw" });
const asciiAssumeValid = createDistance({ profile: "ascii", outOfRange: "assume-valid" });
const latin1Throw = createDistance({ profile: "latin1", outOfRange: "throw" });
const latin1AssumeValid = createDistance({ profile: "latin1", outOfRange: "assume-valid" });
const codeUnitThrow = createDistance({ profile: "codeUnit", outOfRange: "throw" });

const universal = [
  ["v2", levenshteinLightning],
  ["unicode", distanceUnicode],
  ["profile-code-unit-throw", codeUnitThrow],
];

const targets = Object.freeze({
  ascii: Object.freeze([
    ["default", distance],
    ...universal,
    ["profile-ascii-throw", asciiThrow],
    ["profile-ascii-assume-valid", asciiAssumeValid],
    ["profile-latin1-throw", latin1Throw],
    ["profile-latin1-assume-valid", latin1AssumeValid],
  ]),
  latin1: Object.freeze([
    ["default", distance],
    ...universal,
    ["profile-latin1-throw", latin1Throw],
    ["profile-latin1-assume-valid", latin1AssumeValid],
  ]),
  bmp: Object.freeze([...universal]),
});

export function targetsForDomain(domain) {
  if (!targets[domain]) throw new TypeError(`unknown workload domain: ${domain}`);
  return targets[domain];
}

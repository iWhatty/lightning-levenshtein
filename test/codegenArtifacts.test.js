import { referenceDistance } from "../bench/reference-distance.js";
import { myers32_unrolledB } from "../codegen/artifacts/myers32-unrolledB.js";

describe("generated benchmark artifacts", () => {
  test("Myers32 B handles every UTF-16 code-unit table edge", () => {
    const pairs = [
      ["\u0000", "\u0000"],
      ["\u00ff", "\u00ff"],
      ["\uffff", "\uffff"],
      ["\uffffa", "\uffffb"],
      ["a\uffff", "b\uffff"],
    ];

    for (const [a, b] of pairs) {
      expect(myers32_unrolledB(a, b)).toBe(referenceDistance(a, b));
    }
  });

  test("Myers32 B matches the reference across generated length tiers", () => {
    const lengths = [1, 2, 3, 8, 16, 31, 32];
    for (const bLength of lengths) {
      for (let variant = 0; variant < 8; variant++) {
        const aLength = 1 + ((bLength * 3 + variant * 7) % 32);
        const a = fixtureString(aLength, variant);
        const b = fixtureString(bLength, variant + 3);
        expect(myers32_unrolledB(a, b)).toBe(referenceDistance(a, b));
      }
    }
  });

  test("Myers32 B rejects inputs outside its generated domain", () => {
    expect(myers32_unrolledB("", "a")).toBeNull();
    expect(myers32_unrolledB("a", "")).toBeNull();
    expect(myers32_unrolledB("a".repeat(33), "a")).toBeNull();
    expect(myers32_unrolledB("a", "a".repeat(33))).toBeNull();
  });
});

function fixtureString(length, offset) {
  const alphabet = [0, 1, 97, 255, 256, 4096, 65534, 65535];
  return String.fromCharCode(...Array.from(
    { length },
    (_, index) => alphabet[(index * 5 + offset) % alphabet.length]
  ));
}

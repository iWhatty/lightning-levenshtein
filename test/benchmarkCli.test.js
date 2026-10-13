import {
  parseIntegerListArgument,
  parseListArgument,
  parseNonNegativeIntegerArgument,
  parsePositiveIntegerArgument,
  stripArgumentSeparator,
  validateSafeName,
} from "../bench/cli-arguments.js";

describe("benchmark CLI arguments", () => {
  test("parses lists and integers", () => {
    expect(stripArgumentSeparator(["--", "--pairs=8"]))
      .toEqual(["--pairs=8"]);
    expect(parseListArgument("--families=ascii,bmp", "--families="))
      .toEqual(["ascii", "bmp"]);
    expect(parseIntegerListArgument("--lengths=0,32,64", "--lengths="))
      .toEqual([0, 32, 64]);
    expect(parseNonNegativeIntegerArgument("--repetition=0", "--repetition="))
      .toBe(0);
    expect(parsePositiveIntegerArgument("--pairs=8", "--pairs="))
      .toBe(8);
  });

  test("rejects empty, fractional, negative, and zero-only values", () => {
    expect(() => parseListArgument("--lengths=", "--lengths="))
      .toThrow("--lengths cannot be empty");
    expect(() => parseIntegerListArgument("--lengths=1,1.5", "--lengths="))
      .toThrow("comma-separated non-negative integers");
    expect(() => parseNonNegativeIntegerArgument("--repetition=-1", "--repetition="))
      .toThrow("requires a non-negative integer");
    expect(() => parsePositiveIntegerArgument("--pairs=0", "--pairs="))
      .toThrow("must be greater than zero");
    expect(() => parseNonNegativeIntegerArgument("--warm-rounds=", "--warm-rounds="))
      .toThrow("cannot be empty");
    expect(() => parseNonNegativeIntegerArgument("--warm-rounds= ", "--warm-rounds="))
      .toThrow("cannot be empty");
  });

  test("rejects duplicate and unsafe integers before benchmark execution", () => {
    expect(() => parseListArgument("--families=ascii,ascii", "--families="))
      .toThrow("duplicate values");
    expect(() => parseListArgument("--families=ascii, ", "--families="))
      .toThrow("blank values");
    expect(() => parseIntegerListArgument("--seeds=1,,2", "--seeds="))
      .toThrow("blank values");
    expect(() => parseIntegerListArgument("--seeds=1,1", "--seeds="))
      .toThrow("duplicate values");
    expect(() => parseIntegerListArgument("--lengths=1,01", "--lengths="))
      .toThrow("duplicate values");
    expect(() => parseIntegerListArgument("--lengths=9007199254740992", "--lengths="))
      .toThrow("non-negative integers");
    expect(() => parsePositiveIntegerArgument("--pairs=9007199254740992", "--pairs="))
      .toThrow("non-negative integer");
  });

  test("accepts portable names and rejects path-like names", () => {
    expect(validateSafeName("intel-node24_r1-r3", "set name"))
      .toBe("intel-node24_r1-r3");
    expect(() => validateSafeName("../outside", "set name"))
      .toThrow("set name contains unsafe characters");
  });
});

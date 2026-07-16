export type TextProfile = "ascii" | "latin1" | "codeUnit";
export type OutOfRangePolicy = "throw" | "assume-valid";

export interface DistanceProfileOptions {
  profile: TextProfile;
  outOfRange?: OutOfRangePolicy;
}

export function createDistance(
  options: DistanceProfileOptions
): (a: string, b: string) => number;

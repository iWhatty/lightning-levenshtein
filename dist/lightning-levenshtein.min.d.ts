export function distance(a: string, b: string): number;

export function distanceMax(
  a: string,
  b: string,
  maxDistance?: number
): number;

export function closest(
  str: string,
  arr: readonly string[],
  maxDistance?: number
): string | null;

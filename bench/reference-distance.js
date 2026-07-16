export function referenceDistance(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) [a, b] = [b, a];

  let previous = new Uint32Array(a.length + 1);
  let current = new Uint32Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) previous[i] = i;

  for (let row = 1; row <= b.length; row++) {
    current[0] = row;
    for (let column = 1; column <= a.length; column++) {
      const substitution = previous[column - 1] +
        (a.charCodeAt(column - 1) === b.charCodeAt(row - 1) ? 0 : 1);
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        substitution
      );
    }
    [previous, current] = [current, previous];
  }

  return previous[a.length];
}

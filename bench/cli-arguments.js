export function stripArgumentSeparator(args) {
  return args.filter((argument) => argument !== "--");
}

export function parseListArgument(argument, prefix) {
  const raw = argument.slice(prefix.length);
  if (!raw) throw new TypeError(`${optionName(prefix)} cannot be empty`);
  const values = raw.split(",");
  if (values.some((value) => !value.trim())) {
    throw new TypeError(`${optionName(prefix)} contains blank values`);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${optionName(prefix)} contains duplicate values`);
  }
  return values;
}

export function parseIntegerListArgument(argument, prefix) {
  const values = parseListArgument(argument, prefix).map(Number);
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError(`${optionName(prefix)} requires comma-separated non-negative integers`);
  }
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${optionName(prefix)} contains duplicate values`);
  }
  return values;
}

export function parseNonNegativeIntegerArgument(argument, prefix) {
  const raw = argument.slice(prefix.length);
  if (!raw.trim()) throw new TypeError(`${optionName(prefix)} cannot be empty`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${optionName(prefix)} requires a non-negative integer`);
  }
  return value;
}

export function parsePositiveIntegerArgument(argument, prefix) {
  const value = parseNonNegativeIntegerArgument(argument, prefix);
  if (value === 0) throw new TypeError(`${optionName(prefix)} must be greater than zero`);
  return value;
}

export function validateSafeName(value, label) {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) throw new TypeError(`${label} contains unsafe characters`);
  return value;
}

function optionName(prefix) {
  return prefix.endsWith("=") ? prefix.slice(0, -1) : prefix;
}

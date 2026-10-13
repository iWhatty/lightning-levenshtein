import { readdirSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";

export function collectRelativeImports(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const imports = [];

  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) {
        specifier = node.arguments[0];
        while (ts.isParenthesizedExpression(specifier)) specifier = specifier.expression;
      }
    }

    if (specifier && ts.isStringLiteralLike(specifier)) {
      const value = specifier.text;
      if (value.startsWith("./") || value.startsWith("../")) imports.push(value);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

export function hasExactPathCase(root, target) {
  const absoluteRoot = resolve(root);
  const absoluteTarget = resolve(target);
  const relativeTarget = relative(absoluteRoot, absoluteTarget);
  if (isAbsolute(relativeTarget) || relativeTarget === ".." || relativeTarget.startsWith(`..${sep}`)) {
    return false;
  }

  const rootPrefix = absoluteRoot.endsWith(sep) ? absoluteRoot : `${absoluteRoot}${sep}`;
  if (absoluteTarget !== absoluteRoot && !absoluteTarget.startsWith(rootPrefix)) return false;

  let current = absoluteRoot;
  for (const segment of relativeTarget.split(sep)) {
    if (!segment) continue;
    const exactEntry = readdirSync(current, { withFileTypes: true })
      .find((entry) => entry.name === segment);
    if (!exactEntry) return false;
    current = resolve(current, segment);
  }
  return true;
}

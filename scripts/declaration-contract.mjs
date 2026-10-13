import ts from "typescript";

export function parseDeclaration(source, fileName = "declaration.d.ts") {
  if (typeof source !== "string") {
    throw new TypeError("Declaration source must be a string");
  }

  const compilerFileName = "declaration-contract.d.ts";
  const sourceFile = ts.createSourceFile(
    compilerFileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  if (sourceFile.parseDiagnostics?.length) {
    const diagnostic = sourceFile.parseDiagnostics[0];
    const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    throw new Error(
      `Could not parse declaration ${fileName}:${position.line + 1}:${position.character + 1}: ${message}`
    );
  }

  const declarations = new Map();

  for (const statement of sourceFile.statements) {
    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      throwUnsupported(statement, fileName);
    }

    if (ts.isFunctionDeclaration(statement)) {
      addDeclaration(declarations, getDeclarationName(statement, sourceFile, fileName), "value", fileName);
      continue;
    }

    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      addDeclaration(declarations, getDeclarationName(statement, sourceFile, fileName), "type", fileName);
      continue;
    }

    throwUnsupported(statement, fileName);
  }

  if (!ts.isExternalModule(sourceFile)) {
    throw new Error(`Declaration is not a TypeScript external module in ${fileName}`);
  }

  // Declaration modules can expose bare top-level names without an export modifier.
  // Ask TypeScript for the real module surface instead of inferring it from syntax.
  const host = ts.createCompilerHost({ noLib: true });
  host.getSourceFile = (requested) => requested === compilerFileName ? sourceFile : undefined;
  const program = ts.createProgram([compilerFileName], { noLib: true }, host);
  const checker = program.getTypeChecker();
  const semanticDiagnostic = program.getSemanticDiagnostics(sourceFile)[0];
  if (semanticDiagnostic) {
    const position = sourceFile.getLineAndCharacterOfPosition(semanticDiagnostic.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(semanticDiagnostic.messageText, " ");
    throw new Error(
      `Invalid declaration ${fileName}:${position.line + 1}:${position.character + 1}: ${message}`
    );
  }
  const moduleSymbol = program.getSourceFile(compilerFileName)?.symbol;
  if (!moduleSymbol) {
    throw new Error(`Declaration module symbol missing in ${fileName}`);
  }

  const valueNames = [];
  const typeNames = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const kind = declarations.get(symbol.name);
    if (kind === "value" && symbol.flags & ts.SymbolFlags.Function) {
      valueNames.push(symbol.name);
    } else if (kind === "type" && symbol.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) {
      typeNames.push(symbol.name);
    } else {
      throw new Error(`Unsupported semantic declaration export in ${fileName}: ${symbol.name}`);
    }
    declarations.delete(symbol.name);
  }

  if (declarations.size) {
    throw new Error(
      `Declaration missing semantic export in ${fileName}: ${declarations.keys().next().value}`
    );
  }

  return Object.freeze({
    valueNames: Object.freeze(valueNames),
    typeNames: Object.freeze(typeNames),
  });
}

function hasModifier(node, kind) {
  return node.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

function getDeclarationName(node, sourceFile, fileName) {
  if (node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }

  throw new Error(
    `Unsupported exported declaration form in ${fileName}: ${declarationKindName(node)} without an identifier at ${sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1}`
  );
}

function addDeclaration(declarations, name, kind, fileName) {
  if (declarations.has(name)) {
    throw new Error(`Duplicate exported declaration name in ${fileName}: ${name}`);
  }

  declarations.set(name, kind);
}

function throwUnsupported(node, fileName) {
  throw new Error(
    `Unsupported exported declaration form in ${fileName}: ${declarationKindName(node)}`
  );
}

function declarationKindName(node) {
  if (ts.isVariableStatement(node)) return "VariableStatement";
  if (ts.isClassDeclaration(node)) return "ClassDeclaration";
  if (ts.isEnumDeclaration(node)) return "EnumDeclaration";
  if (ts.isModuleDeclaration(node)) return "ModuleDeclaration";
  if (ts.isExportDeclaration(node)) return "ExportDeclaration";
  if (ts.isExportAssignment(node)) return "ExportAssignment";
  if (ts.isNamespaceExportDeclaration?.(node)) return "NamespaceExportDeclaration";
  return `SyntaxKind(${node.kind})`;
}

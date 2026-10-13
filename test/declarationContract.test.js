import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import ts from "typescript";

import { parseDeclaration } from "../scripts/declaration-contract.mjs";

describe("TypeScript declaration contract parser", () => {
  test("ignores comments but includes ambient module exports", () => {
    const declaration = parseDeclaration(`
      // export function fakeValue(): number;
      /* export type FakeType = string; */
      declare function ambientValue(): number;
      type AmbientType = string;
      export function visibleValue(): number;
      export type VisibleType = string;
    `);

    expect(declaration).toEqual({
      valueNames: ["ambientValue", "visibleValue"],
      typeNames: ["AmbientType", "VisibleType"],
    });
  });

  test("TypeScript consumer resolves ambient value and type-only exports", () => {
    const root = mkdtempSync(join(tmpdir(), "lightning declaration consumer "));
    const declaration = `
      export function marker(): void;
      declare function ambientValue(): number;
      interface AmbientType { value: number; }
    `;

    try {
      const fixtureSpecifier = "./fixture.mjs";
      writeFileSync(join(root, "fixture.d.mts"), declaration);
      writeFileSync(join(root, "consumer.mts"), `
        import { ambientValue } from "${fixtureSpecifier}";
        import type { AmbientType } from "${fixtureSpecifier}";
        const result: AmbientType = { value: ambientValue() };
        void result;
      `);

      const program = ts.createProgram([join(root, "consumer.mts")], {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        noEmit: true,
      });
      expect(ts.getPreEmitDiagnostics(program).map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
      )).toEqual([]);
      expect(parseDeclaration(declaration)).toEqual({
        valueNames: ["marker", "ambientValue"],
        typeNames: ["AmbientType"],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("classifies exported functions, type aliases, and interfaces", () => {
    const declaration = parseDeclaration(`
      export interface Options { enabled: boolean; }
      export type Mode = "fast" | "safe";
      export declare function run(options: Options): void;
    `);

    expect(declaration).toEqual({
      valueNames: ["run"],
      typeNames: ["Options", "Mode"],
    });
  });

  test("fails closed for unsupported exported declaration forms", () => {
    expect(() => parseDeclaration("export const value = 1;"))
      .toThrow("Unsupported exported declaration form in declaration.d.ts: VariableStatement");
  });

  test("rejects unsupported ambient forms and script declarations", () => {
    expect(() => parseDeclaration("export function run(): void; declare class Hidden {}"))
      .toThrow("Unsupported exported declaration form in declaration.d.ts: ClassDeclaration");
    expect(() => parseDeclaration("export function run(): void; declare module 'virtual' {}"))
      .toThrow("Unsupported exported declaration form in declaration.d.ts: ModuleDeclaration");
    expect(() => parseDeclaration("declare function globalValue(): void;"))
      .toThrow("Declaration is not a TypeScript external module");
    expect(() => parseDeclaration("export function run(): void; function invalid(): void;"))
      .toThrow("Top-level declarations in .d.ts files must start with either a 'declare' or 'export' modifier.");
  });

  test("does not silently normalize duplicate exported names", () => {
    expect(() => parseDeclaration(`
      export function duplicate(): void;
      export function duplicate(): void;
    `)).toThrow("Duplicate exported declaration name in declaration.d.ts: duplicate");
  });
});

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { assertPackageDeclarations } from "../scripts/package-declaration-contract.mjs";

const subpath = "./fixture";
const declarationTarget = "./dist/fixture.d.ts";

function createFixture({
  declaration = `export function run(): void;\nexport interface Options {}\n`,
  files = ["dist/fixture.d.ts"],
  types = declarationTarget,
  packageExports = {},
} = {}) {
  const packageRoot = mkdtempSync(
    join(tmpdir(), "lightning declaration contract ")
  );
  const declarationPath = join(packageRoot, "dist", "fixture.d.ts");
  mkdirSync(dirname(declarationPath), { recursive: true });
  if (declaration !== null) {
    writeFileSync(declarationPath, declaration);
  }

  const manifest = {
    types,
    default: "./dist/fixture.js",
  };
  const publicExports = [{
    subpath,
    names: ["run"],
    typeNames: ["Options"],
    manifest,
  }];

  return {
    packageRoot,
    pkg: {
      files: [...files],
      exports: {
        [subpath]: {
          ...manifest,
          ...packageExports,
        },
      },
    },
    publicExports,
  };
}

function cleanup(packageRoot) {
  rmSync(packageRoot, { recursive: true, force: true });
}

describe("package declaration contract", () => {
  test("accepts valid declarations and shared declaration files", () => {
    const fixture = createFixture();
    const sharedEntry = {
      ...fixture.publicExports[0],
      subpath: "./fixture/min",
    };
    const publicExports = [...fixture.publicExports, sharedEntry];
    const pkg = {
      ...fixture.pkg,
      exports: {
        ...fixture.pkg.exports,
        [sharedEntry.subpath]: { ...sharedEntry.manifest },
      },
    };

    try {
      expect(() => assertPackageDeclarations({
        ...fixture,
        pkg,
        publicExports,
      })).not.toThrow();
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test("resolves packageRoot independently of current working directory", () => {
    const fixture = createFixture();
    const unrelatedRoot = mkdtempSync(join(tmpdir(), "lightning unrelated "));
    const previousCwd = process.cwd();

    try {
      process.chdir(unrelatedRoot);
      expect(() => assertPackageDeclarations(fixture)).not.toThrow();
    } finally {
      process.chdir(previousCwd);
      cleanup(unrelatedRoot);
      cleanup(fixture.packageRoot);
    }
  });

  test("labels value export drift with subpath context", () => {
    const fixture = createFixture({
      declaration: "export function other(): void;\nexport interface Options {}\n",
    });

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(
        `${subpath} declaration value exports drift`
      );
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test("labels type-only export drift with subpath context", () => {
    const fixture = createFixture({
      declaration: "export function run(): void;\nexport interface Other {}\n",
    });

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(
        `${subpath} declaration type-only exports drift`
      );
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test.each([
    ["value", "declare function ambientValue(): void;", "declaration value exports drift"],
    ["type-only", "interface AmbientType {}", "declaration type-only exports drift"],
  ])("rejects unexpected ambient %s exports", (_label, ambient, message) => {
    const fixture = createFixture({
      declaration: `export function run(): void;\nexport interface Options {}\n${ambient}\n`,
    });

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(`${subpath} ${message}`);
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test.each([
    ["missing", { declaration: null }, "declaration file missing"],
    ["unlisted", { files: [] }, "declaration file not listed in package files"],
  ])("rejects %s declarations", (_label, options, message) => {
    const fixture = createFixture(options);

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(
        `${subpath} ${message}`
      );
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test("rejects declaration targets outside packageRoot", () => {
    const fixture = createFixture({
      declaration: null,
      files: [],
      types: "../outside.d.ts",
    });

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(
        `${subpath} declaration path escapes package root`
      );
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test("rejects declaration targets escaping through filesystem links", () => {
    const fixture = createFixture({ declaration: null });
    const outsideRoot = mkdtempSync(join(tmpdir(), "lightning outside "));
    writeFileSync(
      join(outsideRoot, "fixture.d.ts"),
      "export function run(): void;\nexport interface Options {}\n"
    );
    const linkedDist = join(fixture.packageRoot, "dist-link");
    symlinkSync(outsideRoot, linkedDist, "junction");
    fixture.publicExports[0].manifest.types = "./dist-link/fixture.d.ts";
    fixture.pkg.exports[subpath].types = "./dist-link/fixture.d.ts";
    fixture.pkg.files = ["dist-link/fixture.d.ts"];

    try {
      expect(() => assertPackageDeclarations(fixture)).toThrow(
        `${subpath} declaration path escapes package root through filesystem links`
      );
    } finally {
      cleanup(fixture.packageRoot);
      cleanup(outsideRoot);
    }
  });

  test("retains parser failure as cause with subpath context", () => {
    const fixture = createFixture({
      declaration: "export const broken = 1;\n",
    });

    try {
      let failure;
      try {
        assertPackageDeclarations(fixture);
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(Error);
      expect(failure.message).toContain(`${subpath} declaration parse failed`);
      expect(failure.cause).toBeInstanceOf(Error);
      expect(failure.cause.message).toContain("Unsupported exported declaration form");
    } finally {
      cleanup(fixture.packageRoot);
    }
  });

  test("does not mutate contract arrays", () => {
    const fixture = createFixture();
    const names = fixture.publicExports[0].names;
    const typeNames = fixture.publicExports[0].typeNames;
    const files = fixture.pkg.files;

    try {
      assertPackageDeclarations(fixture);
      expect(names).toEqual(["run"]);
      expect(typeNames).toEqual(["Options"]);
      expect(files).toEqual(["dist/fixture.d.ts"]);
      expect(existsSync(join(fixture.packageRoot, "dist", "fixture.d.ts"))).toBe(true);
    } finally {
      cleanup(fixture.packageRoot);
    }
  });
});

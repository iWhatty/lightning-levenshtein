import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function canonicalPath(file) {
  const absolute = path.resolve(file);
  if (fs.existsSync(absolute)) return fs.realpathSync.native(absolute);
  const parent = path.dirname(absolute);
  if (parent === absolute) throw new Error(`path does not exist: ${file}`);
  return path.join(canonicalPath(parent), path.basename(absolute));
}

export function requireExternalOutputDirectory(outDir, rootDir) {
  if (!outDir) {
    throw new TypeError("measured runs require --out-dir outside the repository");
  }
  const resolved = path.resolve(outDir);
  if (isWithin(path.resolve(rootDir), resolved) ||
      isWithin(canonicalPath(rootDir), canonicalPath(resolved))) {
    throw new Error("measured --out-dir must be outside the repository");
  }
  return resolved;
}

export function requireEvidenceDirectory(directory, repositoryRoot) {
  const canonicalRoot = canonicalPath(repositoryRoot);
  const canonicalDirectory = canonicalPath(directory);
  if (!isWithin(canonicalRoot, canonicalDirectory) || canonicalRoot === canonicalDirectory) {
    throw new Error(`evidence directory is outside repository: ${directory}`);
  }
  return canonicalDirectory;
}

export function requireFileWithin(file, directory, label) {
  const resolved = fs.realpathSync.native(path.resolve(file));
  const root = fs.realpathSync.native(directory);
  if (!isWithin(root, resolved) || resolved === root) {
    throw new Error(`${label} must be inside ${directory}`);
  }
  if (!fs.statSync(resolved).isFile()) throw new Error(`${label} is not a file: ${file}`);
  return resolved;
}

export function writeEvidenceExclusive(file, contents) {
  writeStaged(file, contents, (temporary) => {
    try {
      fs.linkSync(temporary, file);
    } catch (error) {
      if (["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EPERM", "EACCES"].includes(error.code)) {
        const failure = new Error(
          `atomic evidence write requires hard-link support and write permission: ${file}`,
          { cause: error }
        );
        failure.code = error.code;
        throw failure;
      }
      throw error;
    }
  });
}

export function writeEvidenceReplace(file, contents) {
  writeStaged(file, contents, (temporary) => fs.renameSync(temporary, file));
}

function writeStaged(file, contents, publish) {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let opened = false;
  let published = false;
  let failure;
  try {
    const descriptor = fs.openSync(temporary, "wx");
    opened = true;
    try {
      fs.writeFileSync(descriptor, contents, "utf8");
    } finally {
      fs.closeSync(descriptor);
    }
    publish(temporary);
    published = true;
  } catch (error) {
    failure = error;
  }
  if (opened) {
    try {
      fs.unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") {
        // Publication already succeeded; callers must not mistake cleanup failure for a failed write.
        if (!failure && !published) failure = error;
        else process.emitWarning(`Could not remove evidence temp file ${temporary}: ${error.message}`);
      }
    }
  }
  if (failure) throw failure;
}

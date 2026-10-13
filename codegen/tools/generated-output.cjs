const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

function writeOrCheckGeneratedOutputs({
  generated,
  outputPaths,
  label,
  refreshCommand,
  check,
}) {
  const outputs = preflightOutputs(outputPaths);

  if (check) {
    const stalePaths = outputs.filter(({ file }) =>
      !fs.existsSync(file) || normalizeEol(fs.readFileSync(file, 'utf8')) !== generated
    );

    if (stalePaths.length > 0) {
      console.error(`Generated ${label} ${stalePaths.length === 1 ? 'output is' : 'outputs are'} stale:`);
      for (const { file } of stalePaths) console.error(`- ${file}`);
      console.error(`Run \`${refreshCommand}\` to refresh ${stalePaths.length === 1 ? 'it' : 'them'}.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Generated ${label} ${outputs.length === 1 ? 'output is' : 'outputs are'} current`);
    return;
  }

  let failure;
  try {
    for (const output of outputs) {
      fs.mkdirSync(path.dirname(output.file), { recursive: true });
      const temporary = adjacentFile(output.file, 'codegen-temp');
      const descriptor = fs.openSync(temporary, 'wx');
      output.temporary = temporary;
      try {
        fs.writeFileSync(descriptor, generated, 'utf8');
      } finally {
        fs.closeSync(descriptor);
      }
    }

    // No published file changes until every new file and recovery copy exists.
    for (const output of outputs) {
      if (output.existed) {
        const oldBytes = fs.readFileSync(output.file);
        const backup = adjacentFile(output.file, 'codegen-backup');
        const descriptor = fs.openSync(backup, 'wx');
        output.backup = backup;
        try {
          fs.writeFileSync(descriptor, oldBytes);
        } finally {
          fs.closeSync(descriptor);
        }
      }
    }

    for (const output of outputs) {
      fs.renameSync(output.temporary, output.file);
      output.published = true;
    }
  } catch (error) {
    failure = rollbackPublished(outputs, error);
  } finally {
    for (const output of outputs) {
      cleanupOwnedFile(output.temporary);
      if (!output.keepBackup) cleanupOwnedFile(output.backup);
    }
  }

  if (failure) throw failure;
  for (const { file } of outputs) console.log(`Generated ${file}`);
}

function preflightOutputs(outputPaths) {
  if (!Array.isArray(outputPaths) || outputPaths.length === 0) {
    throw new TypeError('Generated outputs require at least one path');
  }

  const names = new Set();
  const identities = new Set();
  return outputPaths.map((outputPath) => {
    if (typeof outputPath !== 'string' || outputPath.length === 0) {
      throw new TypeError('Generated output path must be a non-empty string');
    }
    const file = path.resolve(outputPath);
    const name = process.platform === 'win32' ? file.toLowerCase() : file;
    if (names.has(name)) throw new Error(`Generated output paths alias: ${file}`);
    names.add(name);

    // Reject symlinked files and ancestors; otherwise a configured output may escape.
    for (let current = file; ; current = path.dirname(current)) {
      let stat;
      try {
        stat = fs.lstatSync(current);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (stat?.isSymbolicLink()) throw new Error(`Generated output path uses a symlink: ${current}`);
      if (current === path.dirname(current)) break;
    }

    let stat;
    try {
      stat = fs.statSync(file);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (stat && !stat.isFile()) throw new Error(`Generated output is not a file: ${file}`);
    if (stat && stat.ino !== 0) {
      const identity = `${stat.dev}:${stat.ino}`;
      if (identities.has(identity)) throw new Error(`Generated output paths alias: ${file}`);
      identities.add(identity);
    }
    return { file, existed: Boolean(stat), published: false, keepBackup: false };
  });
}

function rollbackPublished(outputs, originalError) {
  const rollbackErrors = [];
  for (const output of [...outputs].reverse()) {
    if (!output.published) continue;
    try {
      if (output.existed) fs.renameSync(output.backup, output.file);
      else fs.unlinkSync(output.file);
    } catch (error) {
      output.keepBackup = Boolean(output.backup);
      const recovery = output.backup ? `; recovery copy: ${output.backup}` : '';
      rollbackErrors.push(new Error(`Could not roll back generated output ${output.file}${recovery}`, { cause: error }));
    }
  }
  return rollbackErrors.length === 0
    ? originalError
    : new AggregateError([originalError, ...rollbackErrors],
      `Generated output publication failed; rollback failed. ${rollbackErrors.map((error) => error.message).join('; ')}`);
}

function adjacentFile(file, suffix) {
  return path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.${suffix}`);
}

function cleanupOwnedFile(file) {
  if (!file) return;
  try {
    fs.unlinkSync(file);
  } catch (error) {
    if (error.code !== 'ENOENT') process.emitWarning(`Could not remove generated output temporary file ${file}: ${error.message}`);
  }
}

function normalizeEol(value) {
  return value.replace(/\r\n/g, '\n');
}

module.exports = { writeOrCheckGeneratedOutputs };

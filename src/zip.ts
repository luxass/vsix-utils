/**
 * This module contains utility functions for creating and reading vsix files.
 * @module zip
 *
 *  @example
 * ```ts
 * import { readVsix, writeVsix } from "vsix-utils/zip";
 *
 * const success = await writeVsix({
 *   files: [
 *     {
 *       "type": "local",
 *       "localPath": "path/to/file.txt",
 *       "path": "file.txt"
 *     },
 *     {
 *       "type": "in-memory",
 *       "contents": "file contents", // or use a buffer
 *       "path": "file.txt"
 *     }
 *   ],
 * });
 *
 * console.log(sucesss) // true
 * ```
 */

import type { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";
import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import yazl, { type ZipFile } from "yazl";
import { isInMemoryFile, type VsixFile } from "./files";

export interface WriteVsixOptions {
  /**
   * The files that should be included in the Vsix package.
   */
  files: VsixFile[];

  /**
   * The path to write the Vsix package to.
   */
  packagePath: string;

  /**
   * Force the package to be written even if it a file already exists.
   * @default false
   */
  force?: boolean;

  /**
   * The source date epoch to use for the package.
   */
  epoch?: number;
}

/**
 * Writes files to a VSIX package.
 *
 * @param {WriteVsixOptions} options - Configuration options for writing the VSIX package
 * @param {VsixFile[]} options.files - Array of files to include in the package. Can be either in-memory files or files from disk
 * @param {string} options.packagePath - File path where the VSIX package should be written
 * @param {boolean?} options.force - If true, overwrites existing package at packagePath. If false, throws error if package exists
 * @param {number?} options.epoch - Optional timestamp (in seconds) to use for all files in the package. Files will be sorted alphabetically
 *
 * @returns {Promise<boolean>} Promise that resolves to true when package is successfully written
 * @throws {Error} if no files specified, no package path specified, or if package exists and force is false
 *
 * @example
 * ```ts
 * import { writeVsix } from "vsix-utils/zip";
 *
 * const success = await writeVsix({
 *   files: [
 *     {
 *       "type": "local",
 *       "localPath": "path/to/file.txt",
 *       "path": "file.txt"
 *     },
 *     {
 *       "type": "in-memory",
 *       "contents": "file contents", // or use a buffer
 *       "path": "file.txt"
 *     }
 *   ],
 * });
 * ```
 */
export async function writeVsix(options: WriteVsixOptions): Promise<boolean> {
  let { files, packagePath, force, epoch } = options;

  // remove the existing package if it exists
  if (existsSync(packagePath) && !force) {
    throw new Error(`package already exists at ${packagePath}`);
  }

  if (!files || files.length === 0) {
    throw new Error("no files specified to package");
  }

  if (!packagePath) {
    throw new Error("no package path specified");
  }

  // remove the existing package if it exists
  if (existsSync(packagePath) && force) {
    await unlink(packagePath);
  }

  // TODO: remove this when https://github.com/DefinitelyTyped/DefinitelyTyped/pull/71523 has been merged
  const zip = new yazl.ZipFile() as ZipFile & EventEmitter;
  const zipOptions: Partial<yazl.Options> = {};

  if (epoch != null) {
    zipOptions.mtime = new Date(epoch * 1000);
    files = files.sort((a, b) => a.path.localeCompare(b.path));
  }

  for (const f of files) {
    if (isInMemoryFile(f)) {
      zip.addBuffer(
        typeof f.contents === "string"
          ? Buffer.from(f.contents, "utf8")
          : f.contents,
        f.path,
        { ...zipOptions },
      );
      continue;
    }

    zip.addFile(f.localPath, f.path, { ...zipOptions });
  }

  zip.end();

  const zipStream = createWriteStream(packagePath);
  zip.outputStream.pipe(zipStream);

  return new Promise((resolve, reject) => {
    zip.once("error", (err) => {
      reject(err);
    });

    zipStream.once("finish", () => {
      resolve(true);
    });

    zipStream.once("error", (err) => {
      reject(err);
    });
  });
}

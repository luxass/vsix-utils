/**
 * This module contains utility functions for creating and reading vsix files.
 * @module zip
 *
 *  @example
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
 *
 * console.log(sucesss) // true
 * ```
 *
 * @example
 * ```ts
 * import { readVsix } from "vsix-utils/zip";
 *
 * const { files, manifest } = await readVsix({
 *   packagePath: "path/to/package.vsix"
 * });
 *
 * console.log(files) // Map { 'file.txt' => <Buffer 66 69 6c 65 20 63 6f 6e 74 65 6e 74 73> }
 * ```
 */

import type { EventEmitter } from "node:events";
import type { Readable } from "node:stream";
import { Buffer } from "node:buffer";
import { createWriteStream, existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import yauzl from "yauzl";
import yazl from "yazl";
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
  const zip = new yazl.ZipFile() as yazl.ZipFile & EventEmitter;
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
      console.error("error", err);
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

export interface ReadVsixOptions {
  /**
   * The path to the Vsix package to read.
   */
  packagePath: string;
}

export interface RawVsixPackage {
  /**
   * Files of the VSIX package.
   */
  files: Map<string, Buffer>;

  /**
   * The manifest of the VSIX package.
   */
  manifest: Record<string, unknown>;
}

/**
 * Reads and extracts the contents of a VSIX package.
 *
 * @param {ReadVsixOptions} options - The options for reading the VSIX package
 * @param {string} options.packagePath - The file path to the VSIX package
 *
 * @returns {Promise<RawVsixPackage>} A promise that resolves to a {@link RawVsixPackage} containing:
 * - files: A Map of filenames to their contents as Buffers
 * - manifest: The parsed extension.vsixmanifest file as an object
 *
 * @throws Will throw an error if:
 * - The VSIX file cannot be opened
 * - There are errors reading the zip entries
 * - The manifest file is missing or invalid JSON
 */
export async function readVsix(options: ReadVsixOptions): Promise<RawVsixPackage> {
  const { packagePath } = options;
  const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(packagePath, { lazyEntries: true }, (err, zip) => {
      if (err) {
        reject(err);
      } else {
        resolve(zip);
      }
    });
  });

  const files = await new Promise<Map<string, Buffer>>((resolve, reject) => {
    const fileMap = new Map<string, Buffer>();

    zip.once("close", () => resolve(fileMap));
    zip.on("entry", async (entry: yauzl.Entry) => {
      try {
        const buffer = await new Promise<Buffer>((resolve, reject) => {
          zip.openReadStream(entry, (err, stream) => {
            if (err) reject(err);

            stream.once("error", reject);
            stream.once("end", () => {
              if (stream.readable) {
                reject(new Error("Stream ended before all data was read"));
              }
            });

            return resolve(bufferStream(stream));
          });
        });

        fileMap.set(entry.fileName, buffer);
        zip.readEntry();
      } catch (err) {
        zip.close();
        reject(err);
      }
    });

    zip.readEntry();
  });

  if (!files.has("extension.vsixmanifest")) {
    throw new Error("extension.vsixmanifest file is missing");
  }

  const rawManifest = files.get("extension.vsixmanifest")!.toString("utf8");

  const parser = new XMLParser({
    preserveOrder: false,
    transformTagName(tagName) {
      return tagName.toLowerCase();
    },
  });
  const manifest = parser.parse(rawManifest);

  return {
    files,
    manifest,
  };
}

/**
 * Converts a Readable stream into a Buffer by collecting all data chunks.
 *
 * @internal
 * @param {Readable} stream - The readable stream to convert to a Buffer
 * @returns {Promise<Buffer>} A promise that resolves with the complete Buffer containing all stream data
 * @throws {Error} If the stream emits an error event before completion
 */
async function bufferStream(stream: Readable): Promise<Buffer> {
  return await new Promise((c, e) => {
    const buffers: Buffer[] = [];
    stream.on("data", (buffer) => buffers.push(buffer));
    stream.once("error", e);
    stream.once("end", () => c(Buffer.concat(buffers)));
  });
}

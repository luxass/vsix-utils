/**
 * This module contains utility functions for manifests.
 * @module manifest
 *
 * @example
 * ```ts
 * import { readProjectManifest } from "vsix-utils";
 *
 * const projectManifest = await readProjectManifest('/path/to/project');
 *
 * if (projectManifest != null) {
 *   console.log("an error occurred while reading the project manifest");
 * }
 *
 * const { fileName, manifest } = projectManifest;
 *
 * console.log(fileName); // Outputs: /path/to/project/package.json
 * console.log(manifest); // Outputs: Parsed content of package.json
 * ```
 */

import type { Manifest } from "./types";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ProjectManifest {
  fileName: string;
  manifest: Manifest;
}

/**
 * Reads the project manifest (package.json) from the specified project directory.
 *
 * @param {string} projectDir - The directory of the project where the package.json is located.
 * @returns {Promise<ProjectManifest | null>} A promise that resolves to an object containing the file name and the parsed manifest.
 *
 * @example
 * ```ts
 * const { fileName, manifest } = await readProjectManifest('/path/to/project');
 * console.log(fileName); // Outputs: /path/to/project/package.json
 * console.log(manifest); // Outputs: Parsed content of package.json
 * ```
 */
export async function readProjectManifest(projectDir: string): Promise<ProjectManifest | null> {
  try {
    const manifestPath = path.join(projectDir, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));

    return {
      fileName: manifestPath,
      manifest,
    };
  } catch {
    return null;
  }
}

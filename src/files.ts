/**
 * @module files
 *
 * This module contains utility functions for handling files.
 */

import type { Buffer } from "node:buffer";
import type { ExtensionDependency } from "./dependencies";
import type { ManifestAsset } from "./manifest";
import type { Manifest, PackageManager } from "./types";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path, { extname } from "node:path";
import process from "node:process";
import ignore from "ignore";
import mime from "mime";
import { detect } from "package-manager-detector";
import { glob } from "tinyglobby";
import { VSCE_DEFAULT_IGNORE } from "./vsce-constants";

export interface VsixLocalFile {
  type: "local";
  path: string;
  readonly localPath: string;
}

export interface VsixInMemoryFile {
  type: "in-memory";
  path: string;
  readonly contents: Buffer | string;
}

export type VsixFile = VsixLocalFile | VsixInMemoryFile;

export function isLocalFile(file: VsixFile): file is VsixLocalFile {
  return file.type === "local";
}

export function isInMemoryFile(file: VsixFile): file is VsixInMemoryFile {
  return file.type === "in-memory";
}

export interface CollectOptions {
  /**
   * The directory where the extension is located.
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * The file to use for ignoring files.
   */
  ignoreFile?: string;

  /**
   * The dependencies to include in the package.
   */
  dependencies?: ExtensionDependency[];

  /**
   * README file path
   * @default "README.md"
   */
  readme?: string;
}

/**
 * Collects files for a VSIX package based on the provided manifest and options.
 *
 * @param {Manifest} manifest - The VSIX manifest containing package details
 * @param {CollectOptions} options - Configuration options for file collection
 * @param {string?} options.cwd - The current working directory (defaults to process.cwd())
 * @param {string?} options.ignoreFile - The name of the ignore file to use (defaults to ".vscodeignore")
 * @param {ExtensionDependency[]?} options.dependencies - The dependencies to include in the package
 * @param {string?} options.readme - The name of the readme file to include (defaults to "README.md")
 *
 * @returns {Promise<VsixFile[]>} A promise that resolves to an array of VsixFile objects representing the files to be included
 * in the VSIX package. Each file object contains the local path and the target path in the extension.
 *
 * @remarks
 * The function takes into account both .gitignore and .vscodeignore files if they exist.
 * It filters files based on the ignore patterns and includes necessary files like package.json
 * and the readme file.
 */
export async function collect(manifest: Manifest, options: CollectOptions): Promise<VsixFile[]> {
  const {
    cwd = process.cwd(),
    ignoreFile = ".vscodeignore",
    dependencies = [],
    readme = "README.md",
  } = options;

  // TODO: fix all of this ignore file handling.
  const gitignorePath = path.join(cwd, ".gitignore");
  const vscodeIgnorePath = path.join(cwd, ignoreFile);

  const ig = ignore();

  if (existsSync(gitignorePath)) {
    const ignoreContent = await readFile(gitignorePath, "utf8");
    ig.add(ignoreContent);
  }

  if (existsSync(vscodeIgnorePath)) {
    const vsceIgnoreContent = await readFile(vscodeIgnorePath, "utf8");
    ig.add(vsceIgnoreContent);
  }

  const globbedFiles = await glob("**", {
    cwd,
    followSymbolicLinks: true,
    expandDirectories: true,
    ignore: [...VSCE_DEFAULT_IGNORE, "!package.json", `!${readme}`, "node_modules/**"],
    dot: true,
    onlyFiles: true,
  });

  const filteredFiles = globbedFiles.filter((file) => !ig.ignores(file));

  const files = filteredFiles.map((file) => ({
    type: "local",
    localPath: path.join(cwd, file),
    path: path.join("extension/", file),
  })) satisfies VsixFile[];

  if (dependencies.length > 0) {
    for (const dep of dependencies) {
      files.push({
        type: "local",
        path: path.join("extension/node_modules", dep.name),
        localPath: dep.path,
      });
    }
  }

  return files;
}

/**
 * Detects the package manager used in a specific directory.
 * 
 * @param cwd - The current working directory to analyze for package manager detection
 * @returns The name of the detected package manager
 * @throws An error if no package manager is detected or if an unsupported package manager is found
 * 
 * @remarks
 * This function supports npm, yarn, and pnpm package managers. It will throw an error for deno and bun.
 */
export async function getExtensionPackageManager(cwd: string): Promise<PackageManager | null> {
  const result = await detect({ cwd });

  if (result == null) {
    throw new Error("could not detect package manager");
  }

  if (result.name === "deno" || result.name === "bun") {
    throw new Error(`unsupported package manager: ${result.name}`);
  }

  return result.name;
}

// taken from https://github.com/microsoft/vscode-vsce/blob/06951d9f03b90947df6d5ad7d9113f529321df20/src/package.ts#L1581-L1584
// added more default mime types to speed up the process
const DEFAULT_MIME_TYPES = new Map<string, string>([
  [".json", "application/json"],
  [".vsixmanifest", "text/xml"],
  [".md", "text/markdown"],
  [".png", "image/png"],
  [".txt", "text/plain"],
  [".js", "application/javascript"],
  [".yml", "text/yaml"],
  [".html", "text/html"],
  [".markdown", "text/markdown"],
  [".css", "text/css"],
]);

export interface ContentTypeResult {
  /**
   * The Content Types as a map of file extensions to content types.
   */
  contentTypes: Record<string, string>;

  /**
   * The Content Types as an XML string.
   *
   * NOTE:
   * Used inside the VSIX package to define the content types of the files.
   */
  xml: string;
}

/**
 * Generates content types mapping and XML representation for VSIX files.
 *
 * @param files - Array of VSIX files to process
 * @returns Object containing XML string representation of content types and mapping of file extensions to content types
 * @throws Error when content type cannot be determined for a file
 *
 * @remarks
 * This function determines the MIME content type for each file extension in the provided files.
 * It uses a default set of MIME types and falls back to mime type detection when necessary.
 *
 * @example
 * const files = [
 *   { type: "local", path: "extension/package.json", localPath: "/path/to/extension/package.json" },
 *   { type: "local", path: "extension/README.md", localPath: "/path/to/extension/README.md" }
 * ];
 * const { xml, contentTypes } = getContentTypesForFiles(files);
 */
export function getContentTypesForFiles(files: VsixFile[]): ContentTypeResult {
  const contentTypes: Record<string, string> = {};
  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase();

    if (ext == null) continue;

    if (!DEFAULT_MIME_TYPES.has(ext)) {
      // if default mime types doesn't contain ext, lookup the mime type
      const contentType = mime.getType(ext);

      if (contentType == null) {
        throw new Error(`could not determine content type for file: ${file.path}`);
      }

      contentTypes[ext] = contentType;
    } else {
      contentTypes[ext] = DEFAULT_MIME_TYPES.get(ext)!;
    }
  }

  const xml = /* xml */`<?xml version="1.0" encoding="utf-8"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
              ${Object.entries(contentTypes).map(([ext, contentType]) => `<Default Extension="${ext}" ContentType="${contentType}" />\n`).join("")}
             </Types>
          `;

  return {
    xml,
    contentTypes,
  };
}

export interface TransformedFiles {
  /**
   * The assets to include in the manifest.
   *
   * NOTE:
   * These assets are not the extension file, but other files like changelog, readme, license, etc.
   */
  assets: ManifestAsset[];

  /**
   * The icon file path.
   */
  icon?: string;

  /**
   * The license file path.
   */
  license?: string;
}

export interface TransformFilesOptions {
  /**
   * The manifest object containing package details.
   */
  manifest: Manifest;

  /**
   * Files to process.
   */
  files: VsixFile[];

  /**
   * README file path
   */
  readme?: string;
}

/**
 * Transforms files for a VSIX package by identifying and categorizing specific asset files.
 *
 * @remarks
 * This function processes a collection of files to determine which assets should be included in the VSIX manifest.
 * It looks for specific files like license, icon, README, changelog, and translation files.
 *
 * @param options - Configuration options for file transformation
 * @param options.manifest - The extension manifest
 * @param options.files - Array of files to process
 * @param options.readme - Optional README file path
 *
 * @returns A promise resolving to transformed files metadata
 *
 * @throws {Error} If a license file is found but cannot be located in the files array
 */
export async function transformFiles(options: TransformFilesOptions): Promise<TransformedFiles> {
  const { manifest, files, readme } = options;

  const assets: ManifestAsset[] = [];
  let license: string | undefined;
  let icon: string | undefined;

  const hasLicenseFile = hasExtensionFile(files, ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENSE.markdown"]);
  const hasIconFile = hasExtensionFile(files, [manifest.icon]);
  // TODO: use default readme file names
  const hasReadmeFile = hasExtensionFile(files, [readme, "README.md"]);
  const hasChangelogFile = hasExtensionFile(files, ["CHANGELOG.md", "CHANGELOG.markdown", "CHANGELOG.txt"]);
  const hasTranslationsFiles = hasExtensionFile(files, ["package.nls.json"]);

  if (hasLicenseFile.found) {
    if (!extname(hasLicenseFile.path!)) {
      const entryIndex = files.findIndex((f) => f.path === hasLicenseFile.path);

      if (entryIndex === -1) {
        throw new Error(`could not find license file: ${hasLicenseFile.path}`);
      }

      const entry = files[entryIndex!]!;

      files[entryIndex!] = {
        ...entry,
        path: `${hasLicenseFile.path}.md`,
      };

      hasLicenseFile.path = files[entryIndex!]!.path;
    }

    license = hasLicenseFile.path;

    assets.push({
      type: "Microsoft.VisualStudio.Services.Content.License",
      path: license!,
    });
  }

  if (hasIconFile.found) {
    icon = hasIconFile.path;

    assets.push({
      type: "Microsoft.VisualStudio.Services.Icons.Default",
      path: icon!,
    });
  }

  if (hasReadmeFile.found) {
    assets.push({
      type: "Microsoft.VisualStudio.Services.Content.Details",
      path: hasReadmeFile.path!,
    });
  }

  if (hasChangelogFile.found) {
    assets.push({
      type: "Microsoft.VisualStudio.Services.Content.Changelog",
      path: hasChangelogFile.path!,
    });
  }

  if (hasTranslationsFiles.found) {
    assets.push({
      type: "Microsoft.VisualStudio.Code.Translation.en",
      path: hasTranslationsFiles.path!,
    });
  }

  return {
    assets,
    icon,
    license,
  };
}

function hasExtensionFile(files: VsixFile[], fileNames: (string | undefined)[]): { found: boolean; path: string | undefined } {
  for (const fileName of fileNames) {
    if (fileName == null) continue;
    const file = files.find((f) => f.path.endsWith(fileName));

    if (file) {
      return { found: true, path: file.path };
    }
  }

  return { found: false, path: undefined };
}

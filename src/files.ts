/**
 * @module files
 *
 * This module contains utility functions for handling files.
 */

import type { Buffer } from "node:buffer";
import type { ManifestAsset } from "./manifest";
import type { Manifest, PackageManager, PackageManagerWithAuto } from "./types";
import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path, { extname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import ignore from "ignore";
import mime from "mime";
import { detect } from "package-manager-detector";
import { glob } from "tinyglobby";
import { VSCE_DEFAULT_IGNORE } from "./vsce-constants";

const execAsync = promisify(exec);

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
        localPath: dep.path.replace(process.cwd() + path.sep, ""),
      });
    }
  }

  return files;
}

/**
 * Detects and returns the package manager being used in the specified directory.
 *
 * @param {string} cwd - The current working directory path to detect the package manager from
 * @returns {Promise<PackageManager | null>} Promise that resolves with the detected package manager name
 * @throws {Error} If no package manager could be detected
 * @throws {Error} If an unsupported package manager (deno/bun) is detected
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

export interface ExtensionDependenciesOptions {
  /**
   * The package manager to use.
   */
  packageManager: PackageManager;

  /**
   * The current working directory
   * @default process.cwd()
   */
  cwd: string;
}

export interface ExtensionDependency {
  /**
   * The name of the dependency.
   */
  name: string;

  /**
   * The version of the dependency.
   */
  version?: string;

  /**
   * The path to the dependency.
   */
  path: string;
}

interface PnpmDependency {
  from: string;
  version: string;
  resolved: string;
  path: string;
  dependencies: Record<string, PnpmDependency>;
}

interface YarnTreeNode {
  name: string;
  children: YarnTreeNode[];
}

interface YarnDependency {
  name: string;
  path: string;
  version: string;
  children: YarnDependency[];
}

/**
 * Retrieves all production dependencies for an extension based on the package manager being used.
 *
 * @param {Manifest} manifest - The extension's manifest object containing dependency information
 * @param {ExtensionDependenciesOptions} options - Configuration options for retrieving dependencies
 *
 * @returns {Promise<ExtensionDependenciesResult} Promise resolving to an object containing:
 * - dependencies: Array of extension dependencies with name, version and path
 * - packageManager: The package manager that was used
 *
 * @throws Error if:
 * - Package manager cannot be detected when using 'auto'
 * - Unsupported package manager is detected/specified (e.g. deno, bun)
 * - Unable to parse dependency information from package manager output
 *
 * @remarks
 * Supports npm, yarn, and pnpm package managers.
 * When using npm, parses output of `npm list`
 * When using yarn, parses output of `yarn list`
 * When using pnpm, parses output of `pnpm list`
 */
export async function getExtensionDependencies(manifest: Manifest, options: ExtensionDependenciesOptions): Promise<ExtensionDependency[]> {
  const {
    packageManager,
    cwd = process.cwd(),
  } = options;

  const dependencies = new Set<ExtensionDependency>();

  if (packageManager === "npm") {
    const { stdout } = await execAsync("npm list --production --parseable --depth=99999 --loglevel=error", { cwd });
    const lines = stdout.split(/[\r\n]/).filter((path) => isAbsolute(path));

    for (const line of lines) {
      if (line === resolve(cwd)) {
        continue;
      }

      const dependency = line.split(`${path.sep}node_modules${path.sep}`)[1];

      if (dependency == null) {
        throw new Error(`could not parse dependency: ${line}`);
      }

      dependencies.add({
        name: dependency.replace(/\\/g, "/"),
        version: manifest.dependencies != null ? manifest.dependencies[dependency.replace(/\\/g, "/")] : undefined,
        path: line,
      });
    }
  } else if (packageManager === "yarn") {
    const { stdout } = await execAsync("yarn list --prod --json", { cwd });

    const match = /^\{"type":"tree".*$/m.exec(stdout);

    if (!match || match.length !== 1) {
      throw new Error("Could not parse result of `yarn list --json`");
    }

    const trees = JSON.parse(match[0]).data.trees as YarnTreeNode[];

    if (!Array.isArray(trees) || trees.length === 0) {
      return [];
    }

    const prune = true; // TODO: using packaged dependencies

    function asYarnDependency(prefix: string, tree: YarnTreeNode, prune: boolean): YarnDependency | null {
      if (prune && /@[\^~]/.test(tree.name)) {
        return null;
      }

      let name: string;
      let version: string = "";
      try {
        const tmp = tree.name.split("@");

        if (tmp[0] === "") {
          tmp.shift();
          tmp[0] = `@${tmp[0]}`;
        }

        name = tmp[0]!;
        version = tmp[1] || "";
      } catch {
        name = tree.name.replace(/^([^@+])@.*$/, "$1");
      }

      const dependencyPath = path.join(prefix, name);
      const children: YarnDependency[] = [];

      for (const child of tree.children || []) {
        const dep = asYarnDependency(path.join(prefix, name, "node_modules"), child, prune);

        if (dep) {
          children.push(dep);
        }
      }

      return { name, path: dependencyPath, children, version };
    }

    const result = trees.map((tree) => asYarnDependency(join(cwd, "node_modules"), tree, prune)).filter((dep) => dep != null);

    const internalDeps = new Set<string>();

    const flatten = (dep: YarnDependency) => {
      if (internalDeps.has(dep.path)) {
        return;
      }

      dependencies.add({
        name: dep.name,
        version: dep.version,
        path: dep.path,
      });
      internalDeps.add(dep.path);

      if (dep.children) {
        for (const child of dep.children) {
          flatten(child);
        }
      }
    };

    for (const dep of result) {
      flatten(dep);
    }
  } else if (packageManager === "pnpm") {
    // use --ignore-workspace to avoid always including the workspace packages
    const { stdout } = await execAsync("pnpm list --production --json --depth=99999 --loglevel=error --ignore-workspace", { cwd });
    let entryList = [];
    try {
      entryList = JSON.parse(stdout);
    } catch {
      return [];
    }

    if (!Array.isArray(entryList) || entryList.length === 0) {
      return [];
    }

    const entry = entryList[0] as {
      dependencies?: Record<string, PnpmDependency>;
    };

    if (entry == null || typeof entry !== "object" || entry.dependencies == null || typeof entry.dependencies !== "object") {
      return [];
    }

    const internalDeps = new Set<string>();

    const flatten = (dep: PnpmDependency) => {
      if (internalDeps.has(dep.path)) {
        return;
      }

      dependencies.add({
        name: dep.from,
        version: dep.version,
        path: dep.path,
      });
      internalDeps.add(dep.path);

      if (dep.dependencies) {
        for (const child of Object.values(dep.dependencies)) {
          flatten(child);
        }
      }
    };

    for (const value of Object.values(entry.dependencies)) {
      flatten(value);
    }
  } else {
    throw new Error(`unsupported package manager: ${packageManager}`);
  }

  return Array.from(dependencies);
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
 * Generates content types mapping and XML representation for VSIX files
 * @param {VsixFile[]} files - Array of VSIX files to process
 * @returns {ContentTypeResult} Object containing:
 *  - xml: XML string representation of content types
 *  - contentTypes: Record mapping file extensions to their content types
 * @throws {Error} When content type cannot be determined for a file
 * @example
 * ```ts
 * import { getContentTypesForFiles } from "vsix-utils/files";
 *
 * const files = [
 *   { type: "local", path: "extension/package.json", localPath: "/path/to/extension/package.json" },
 *   { type: "local", path: "extension/README.md", localPath: "/path/to/extension/README.md" },
 *   { type: "local", path: "extension/LICENSE", localPath: "/path/to/extension/LICENSE" },
 *   { type: "local", path: "extension/dist/extension.js", localPath: "/path/to/extension/dist/extension.js" },
 * ];
 *
 * const { xml, contentTypes } = getContentTypesForFiles(files);
 * ```
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

export interface ProcessedFiles {
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

export interface ProcessFileOptions {
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

export async function processFiles(options: ProcessFileOptions): Promise<ProcessedFiles> {
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

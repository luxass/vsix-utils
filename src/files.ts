/**
 * This module contains utility functions for handling files.
 * @module files
 */

import type { Buffer } from "node:buffer";
import type { Manifest, PackageManager } from "./types";
import { exec } from "node:child_process";
import { isAbsolute } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

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

export interface ExtensionDependenciesOptions {
  /**
   * The package manager to use.
   * @default "auto"
   */
  packageManager?: PackageManager;

  /**
   * The current working directory
   * @default process.cwd()
   */
  cwd: string;
}

export interface ExtensionDependenciesResult {
  /**
   * The dependencies of the extension.
   */
  dependencies: string[];

  /**
   * The package manager used to resolve the dependencies.
   */
  packageManager: Exclude<PackageManager, "auto"> | null;
}

export async function getExtensionDependencies(manifest: Manifest, options: ExtensionDependenciesOptions): Promise<ExtensionDependenciesResult> {
  const {
    packageManager: pm = "auto",
    cwd = process.cwd(),
  } = options;

  let packageManager: Exclude<PackageManager, "auto"> | null = null;

  if (pm === "auto") {
    const detect = await import("package-manager-detector/detect").then((m) => m.detect);

    const result = await detect({ cwd });

    if (result == null) {
      throw new Error("could not detect package manager");
    }

    if (result.name === "deno" || result.name === "bun") {
      throw new Error(`unsupported package manager: ${result.name}`);
    }

    packageManager = result.name;
  } else {
    packageManager = pm;
  }

  const dependencies = new Set<string>();

  if (packageManager === "npm") {
    const { stdout } = await execAsync("npm list --production --parseable --depth=99999 --loglevel=error", { cwd });
    const lines = stdout.split(/[\r\n]/).filter((path) => isAbsolute(path));

    for (const line of lines) {
      dependencies.add(line);
    }
  } else if (packageManager === "yarn") {
    throw new Error("yarn is not supported yet");
  } else if (packageManager === "pnpm") {
    throw new Error("pnpm is not supported yet");
  } else {
    throw new Error(`unsupported package manager: ${packageManager}`);
  }

  return {
    dependencies: Array.from(dependencies),
    packageManager,
  };
}

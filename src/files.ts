/**
 * This module contains utility functions for handling files.
 * @module files
 */

import type { Buffer } from "node:buffer";
import type { Manifest, PackageManager } from "./types";
import process from "node:process";

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
   */
  packageManager: PackageManager;

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
  packageManager: PackageManager;
}

export async function getExtensionDependencies(manifest: Manifest, options: ExtensionDependenciesOptions): Promise<ExtensionDependenciesResult | null> {
  const {
    packageManager: pm,
    cwd = process.cwd(),
  } = options;

  const packageManager = pm;

  return {
    dependencies: [],
    packageManager,
  };
}

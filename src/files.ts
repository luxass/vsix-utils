/**
 * This module contains utility functions for handling files.
 * @module files
 */

import type { Buffer } from "node:buffer";

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

/**
 * This module contains utility functions for handling files.
 * @module
 */

export type {
  VsixFile,
  VsixInMemoryFile,
  VsixLocalFile,
} from "./files";
export {
  isInMemoryFile,
  isLocalFile,
} from "./files";

export type {
  RawVsixPackage,
  ReadVsixOptions,
  WriteVsixOptions,
} from "./zip";
export {
  readVsix,
  writeVsix,
} from "./zip";

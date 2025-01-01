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

export type { ProjectManifest } from "./manifest";

export {
  readProjectManifest,
} from "./manifest";
export type { Manifest } from "./types";
export type { ManifestValidation } from "./validation";
export {
  ALLOWED_SPONSOR_PROTOCOLS,
  EXTENSION_NAME_REGEX,
  EXTENSION_PRICING,
  GITHUB_BADGE_URL_REGEX,
  VALID_EXTENSION_KINDS,
  validateProjectManifest,
  validateVSCodeTypesCompatability,
  VSCODE_ENGINE_COMPATIBILITY_REGEX,
} from "./validation";

export type {
  RawVsixPackage,
  ReadVsixOptions,
  WriteVsixOptions,
} from "./zip";

export {
  readVsix,
  writeVsix,
} from "./zip";

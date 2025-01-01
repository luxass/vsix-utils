/**
 * @module
 *
 * This module contains utility functions for handling files.
 */

export type {
  CollectOptions,
  ContentTypeResult,
  ExtensionDependenciesOptions,
  ExtensionDependenciesResult,
  ExtensionDependency,
  VsixFile,
  VsixInMemoryFile,
  VsixLocalFile,
} from "./files";
export {
  collect,
  getContentTypesForFiles,
  getExtensionDependencies,
  isInMemoryFile,
  isLocalFile,
} from "./files";

export type {
  ManifestAsset,
  ManifestAssetType,
  ProjectManifest,
  VsixManifestOptions,
} from "./manifest";

export {
  createVsixManifest,
  readProjectManifest,
  transformExtensionKind,
} from "./manifest";
export type { Manifest, PackageManager } from "./types";
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

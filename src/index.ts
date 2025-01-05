/**
 * @module
 *
 * This module contains utility functions for handling files.
 */

export type {
  CollectOptions,
  ContentTypeResult,
  ExtensionDependenciesOptions,
  ExtensionDependency,
  ProcessedFiles,
  VsixFile,
  VsixInMemoryFile,
  VsixLocalFile,
} from "./files";
export {
  collect,
  getContentTypesForFiles,
  getExtensionDependencies,
  getExtensionPackageManager,
  isInMemoryFile,
  isLocalFile,
  processFiles,
} from "./files";

export type {
  ManifestAsset,
  ManifestAssetType,
  ProjectManifest,
  VsixManifestOptions,
} from "./manifest";

export {
  createVsixManifest,
  getManifestTags,
  isWebKind,
  readProjectManifest,
  transformExtensionKind,
} from "./manifest";
export { prepublish, type PrepublishOptions } from "./scripts";
export type {
  Manifest,
  PackageManager,
  PackageManagerWithAuto,
} from "./types";
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

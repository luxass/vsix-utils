/**
 * @module
 *
 * This module contains utility functions for handling files.
 */

export type { ExtensionDependenciesOptions, ExtensionDependency } from "./dependencies";
export { getExtensionDependencies } from "./dependencies";

export type {
  CollectOptions,
  ContentTypeResult,
  TransformedFiles,
  TransformFilesOptions,
  VsixFile,
  VsixInMemoryFile,
  VsixLocalFile,
} from "./files";

export {
  collect,
  getContentTypesForFiles,
  getExtensionPackageManager,
  isInMemoryFile,
  isLocalFile,
  transformFiles,
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
export { inferBaseUrls, type InferredBaseUrls, transformMarkdown, type TransformMarkdownOptions } from "./markdown";
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

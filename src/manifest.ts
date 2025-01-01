/**
 * @module manifest
 *
 * This module contains utility functions for manifests.
 *
 * @example
 * ```ts
 * import { readProjectManifest } from "vsix-utils";
 *
 * const projectManifest = await readProjectManifest('/path/to/project');
 *
 * if (projectManifest != null) {
 *   console.log("an error occurred while reading the project manifest");
 * }
 *
 * const { fileName, manifest } = projectManifest;
 *
 * console.log(fileName); // Outputs: /path/to/project/package.json
 * console.log(manifest); // Outputs: Parsed content of package.json
 * ```
 *
 * @example
 * ```ts
 * import { createVsixManifest, readProjectManifest } from "vsix-utils";
 *
 * const projectManifest = await readProjectManifest('/path/to/project');
 *
 * if (projectManifest != null) {
 *   console.log("an error occurred while reading the project manifest");
 * }
 *
 * const { fileName, manifest } = projectManifest;
 *
 * const vsixManifest = createVsixManifest(manifest, {
 *   assets: [
 *     { type: "Microsoft.VisualStudio.Services.Icons.Default", path: "icon.png" },
 *   ]
 * });
 * ```
 */

import type { ExtensionKind, Manifest } from "./types";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Represents the project manifest.
 */
export interface ProjectManifest {
  /**
   * The file name of the project manifest.
   */
  fileName: string;

  /**
   * The parsed content of the project manifest.
   */
  manifest: Manifest;
}

/**
 * Reads the project manifest (package.json) from the specified project directory.
 *
 * @param {string} projectDir - The directory of the project where the package.json is located.
 * @returns {Promise<ProjectManifest | null>} A promise that resolves to an object containing the file name and the parsed manifest content, or null if the manifest could not be read.
 *
 * @example
 * ```ts
 * const { fileName, manifest } = await readProjectManifest('/path/to/project');
 * console.log(fileName); // Outputs: /path/to/project/package.json
 * console.log(manifest); // Outputs: Parsed content of package.json
 * ```
 */
export async function readProjectManifest(projectDir: string): Promise<ProjectManifest | null> {
  try {
    const manifestPath = path.join(projectDir, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));

    return {
      fileName: manifestPath,
      manifest,
    };
  } catch {
    return null;
  }
}

const escapeChars = new Map([
  ["'", "&apos;"],
  ["\"", "&quot;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ["&", "&amp;"],
]);

function escapeXml(value: unknown): string {
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  return String(value).replace(/(['"<>&])/g, (_, char) => escapeChars.get(char)!);
}

export type ManifestAssetType =
  | "Microsoft.VisualStudio.Services.Icons.Default" // Icon
  | `Microsoft.VisualStudio.Code.Translation.${string}` // Translation
  | "Microsoft.VisualStudio.Services.Content.License" // License
  | "Microsoft.VisualStudio.Services.Content.Details" // README
  | "Microsoft.VisualStudio.Services.Content.Changelog"; // CHANGELOG

/**
 * Represents an asset in the VSIX manifest.
 */
export interface ManifestAsset {
  /**
   * The type of the asset.
   */
  type: ManifestAssetType;

  /**
   * The path to the asset.
   */
  path: string;
}

/**
 * Represents the options for creating a VSIX manifest.
 */
export interface VsixManifestOptions {
  /**
   * Assets to include in the VSIX
   */
  assets?: ManifestAsset[];

  /**
   * The target platform for the extension.
   */
  target?: string;

  /**
   * The path to license file for the extension.
   */
  license?: string;

  /**
   * The path to the icon file for the extension.
   */
  icon?: string;

  /**
   * Tags for the extension.
   */
  tags?: string[];

  /**
   * Flags for the extension.
   */
  flags?: string[];

  /**
   * QnA link for customer support
   * @default false
   *
   * NOTE:
   * you can either set it to "marketplace" or a custom link.
   * If you set it to false, the QnA link will not be included in the manifest.
   */
  qna?: "marketplace" | (string & {}) | false;

  /**
   * Whether or not the extension is a pre-release version.
   * @default false
   */
  preRelease?: boolean;
}

const GITHUB_REPOSITORY_REGEX = /^https:\/\/github\.com\/|^git@github\.com:/;

export function createVsixManifest(manifest: Manifest, options: VsixManifestOptions): string {
  const { assets = [], icon, license, target, tags = [], flags = [], qna = false, preRelease = false } = options;
  const galleryBanner = manifest.galleryBanner ?? {};
  const extensionKind = transformExtensionKind(manifest);
  const localizedLanguages = manifest.contributes?.localizations
    ? manifest.contributes.localizations
        .map((loc) => loc.localizedLanguageName ?? loc.languageName ?? loc.languageId)
        .join(",")
    : "";

  const isQnaEnabled = qna !== false;
  let repository;

  if (manifest.repository != null) {
    if (typeof manifest.repository === "string") {
      repository = manifest.repository;
    } else if (typeof manifest.repository === "object" && "url" in manifest.repository && typeof manifest.repository.url === "string") {
      repository = manifest.repository.url;
    }
  }

  let bugs;

  if (manifest.bugs != null) {
    if (typeof manifest.bugs === "string") {
      bugs = manifest.bugs;
    } else if (typeof manifest.bugs === "object" && "url" in manifest.bugs && typeof manifest.bugs.url === "string") {
      bugs = manifest.bugs.url;
    } else if (typeof manifest.bugs === "object" && "email" in manifest.bugs && typeof manifest.bugs.email === "string") {
      bugs = `mailto:${manifest.bugs.email}`;
    }
  }

  // TODO: make a case for bugs url to go to repository issues

  let homepage;

  if (manifest.homepage != null && typeof manifest.homepage === "string") {
    homepage = manifest.homepage;
  }

  // TODO: make a case for homepage to go to repository's readme

  return /* xml */ `<?xml version="1.0" encoding="utf-8"?>
  <PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
    <Metadata>
      <Identity Language="en-US" Id="${escapeXml(manifest.name)}" Version="${escapeXml(manifest.version)}" Publisher="${escapeXml(manifest.publisher)}" ${target != null ? `TargetPlatform="${escapeXml(target)}"` : ""} />
      <DisplayName>${escapeXml(manifest.displayName ?? manifest.name)}</DisplayName>
      <Description xml:space="preserve">${escapeXml(manifest.description ?? "")}</Description>
      <Tags>${escapeXml(tags.join(",") ?? "")}</Tags>
      <GalleryFlags>${escapeXml(flags.join(" ") ?? "")}</GalleryFlags>
      ${manifest.badges == null
          ? ""
          : `
      <Badges>
        ${manifest.badges
          .map(
            (badge) => `
        <Badge Link="${escapeXml(badge.href)}" ImgUri="${escapeXml(badge.url)}" Description="${escapeXml(badge.description)}" />
        `,
          )
          .join("\n")}
      </Badges>
      `
      }

      <Properties>
        <Property Id="Microsoft.VisualStudio.Code.Engine" Value="${escapeXml(manifest.engines.vscode)}" />
        <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="${escapeXml((manifest.extensionDependencies || []).join(","))}" />
        <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="${escapeXml((manifest.extensionPack || []).join(","))}" />
        <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="${escapeXml(extensionKind.join(","))}" />
        <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="${escapeXml(localizedLanguages)}" />
        <Property Id="Microsoft.VisualStudio.Code.EnabledApiProposals" Value="${escapeXml((manifest.enabledApiProposals || []).join(","))}" />
        <Property Id="Microsoft.VisualStudio.Code.PreRelease" Value="${escapeXml(preRelease)}" />
        <Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="${escapeXml(!!(manifest.main ?? manifest.browser))}" />
        ${manifest.sponsor?.url != null ? `<Property Id="Microsoft.VisualStudio.Code.SponsorLink" Value="${escapeXml(manifest.sponsor.url)}" />` : ""}

        ${repository != null ? `<Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="${escapeXml(repository)}" />` : ""}
        ${repository != null ? `<Property Id="Microsoft.VisualStudio.Services.Links.Getstarted" Value="${escapeXml(repository)}" />` : ""}

        ${repository != null ? `<Property Id="Microsoft.VisualStudio.Services.Links.${GITHUB_REPOSITORY_REGEX.test(repository) ? "GitHub" : "Repository"}" Value="${escapeXml(repository)}" />` : ""}

        ${bugs != null ? `<Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="${escapeXml(bugs)}" />` : ""}
        ${homepage != null ? `<Property Id="Microsoft.VisualStudio.Services.Links.Learn" Value="${escapeXml(homepage)}" />` : ""}

        ${galleryBanner.color != null ? `<Property Id="Microsoft.VisualStudio.Services.Branding.Color Value="${escapeXml(galleryBanner.color)}" />` : ""}
        ${galleryBanner.theme != null ? `<Property Id="Microsoft.VisualStudio.Services.Branding.Theme Value="${escapeXml(galleryBanner.theme)}" />` : ""}

        <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="${escapeXml(manifest.markdown !== "standard")}" />
        <Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="${escapeXml(manifest.pricing ?? "Free")}" />

        ${isQnaEnabled ? `<Property Id="Microsoft.VisualStudio.Services.EnableMarketplaceQnA" Value="${escapeXml(qna)}" />` : ""}
        ${(isQnaEnabled && qna !== "marketplace") ? `<Property Id="Microsoft.VisualStudio.Services.CustomerQnALink" Value="${escapeXml(qna)}" />` : ""}
      </Properties>

      ${license != null ? `<License>${escapeXml(license)}</License>` : ""}
      ${icon != null ? `<Icon>${escapeXml(icon)}</Icon>` : ""}
    </Metadata>
    <Installation>
      <InstallationTarget Id="Microsoft.VisualStudio.Code" />
    </Installation>
    <Dependencies />
    <Assets>
      <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="package.json" Addressable="true" />
      ${assets.map((asset) => `<Asset Type="${escapeXml(asset.type)}" Path="${escapeXml(asset.path)}" Addressable="true" />`).join("\n")}
    </Assets>
  </PackageManifest>`;
}

// taken from here: https://github.com/microsoft/vscode-vsce/blob/06951d9f03b90947df6d5ad7d9113f529321df20/src/package.ts#L1149-L1159
const CONTRIBUTION_POINTS_FOR_EXTENSION_KIND = new Map<string, ExtensionKind[]>([
  ["jsonValidation", ["workspace", "web"]],
  ["localizations", ["ui", "workspace"]],
  ["debuggers", ["workspace"]],
  ["terminal", ["workspace"]],
  ["typescriptServerPlugins", ["workspace"]],
  ["markdown.previewStyles", ["workspace", "web"]],
  ["markdown.previewScripts", ["workspace", "web"]],
  ["markdown.markdownItPlugins", ["workspace", "web"]],
  ["html.customData", ["workspace", "web"]],
  ["css.customData", ["workspace", "web"]],
]);

/**
 * Transforms an extension manifest to determine the appropriate extension kinds.
 * Extension kinds define where an extension can run (UI, workspace, web).
 *
 * The transformation follows these rules:
 * 1. Uses explicit extension kinds if specified in manifest
 * 2. Adds "web" kind if browser support is detected
 * 3. Determines kinds based on main entry point presence
 * 4. Handles extension packs and dependencies
 * 5. Filters kinds based on contribution points
 *
 * @param {Manifest} manifest - The extension manifest object to transform
 * @returns {ExtensionKind[]} An array of ExtensionKind values representing where the extension can run
 *
 * @example
 * ```ts
 * const manifest = {
 *   browser: "dist/web/extension.js",
 *   main: "dist/extension.js"
 * };
 *
 * transformExtensionKind(manifest); // Returns ["workspace", "web"]
 * ```
 */
export function transformExtensionKind(manifest: Manifest): ExtensionKind[] {
  const isWebSupported = manifest.browser != null;

  if (manifest.extensionKind != null) {
    const explicitKinds: ExtensionKind[] = Array.isArray(manifest.extensionKind)
      ? manifest.extensionKind
      : manifest.extensionKind === "ui"
        ? ["ui", "workspace"]
        : [manifest.extensionKind];

    if (isWebSupported && !explicitKinds.includes("web")) {
      explicitKinds.push("web");
    }

    return explicitKinds;
  }

  if (manifest.main != null && isWebSupported) {
    return ["workspace", "web"];
  }

  if (manifest.main != null) {
    return ["workspace"];
  }

  if (isWebSupported) {
    return ["web"];
  }

  const isNonEmptyArray = (obj: any) => Array.isArray(obj) && obj.length > 0;
  if (isNonEmptyArray(manifest.extensionPack)
    || isNonEmptyArray(manifest.extensionDependencies)) {
    return ["workspace", "web"];
  }

  let result: ExtensionKind[] = ["ui", "workspace", "web"];

  if (manifest.contributes != null) {
    for (const contribution of Object.keys(manifest.contributes)) {
      const supportedKinds = CONTRIBUTION_POINTS_FOR_EXTENSION_KIND.get(contribution);
      if (supportedKinds) {
        result = result.filter((kind) => supportedKinds.includes(kind));
      }
    }
  }

  return result;
}

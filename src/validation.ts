/**
 * This module contains utility functions for validating manifests.
 * @module validation
 */

import type { Manifest } from "./types";
import { satisfies, valid, validRange } from "semver";
import { VSCE_TRUSTED_SOURCES } from "./constants";

/**
 * Validates the compatibility between VS Code engine version and @types/vscode version
 *
 * @param {string} engineVersion - The VS Code engine version specified in package.json (e.g., "^1.70.0")
 * @param {string} typesVersion - The @types/vscode version specified in package.json (e.g., "1.70.0")
 *
 * @throws {Error} When engine version is invalid
 * @throws {Error} When types version is invalid
 * @throws {Error} When either version cannot be parsed
 * @throws {Error} When types version is higher than engine version
 *
 * @remarks
 * If engine version is "*", no validation is performed as it indicates compatibility with any version.
 * The function ensures that the @types/vscode version does not exceed the specified engine version
 * to prevent compatibility issues.
 */
export function validateVSCodeTypesCompatability(
  engineVersion: string,
  typesVersion: string,
): void {
  // if engines is `*`, then we don't care about the types version
  // as `*` means any version is allowed
  if (engineVersion === "*") {
    return;
  }

  // check that versions is actually valid
  if (validRange(engineVersion) == null) {
    throw new Error(`invalid engine version '${engineVersion}'`);
  }

  if (validRange(typesVersion) == null) {
    throw new Error(`invalid types version '${typesVersion}'`);
  }

  const [engineMajor, engineMinor] = engineVersion
    .replace(/^\D+/, "")
    .replace(/x/g, "0")
    .split(".")
    .map((x) => Number.parseInt(x, 10));

  const [typesMajor, typesMinor] = typesVersion
    .replace(/^\D+/, "")
    .replace(/x/g, "0")
    .split(".")
    .map((x) => Number.parseInt(x, 10) || 0);

  if (typesMajor == null || typesMinor == null || engineMajor == null || engineMinor == null) {
    throw new Error("invalid engine or types version");
  }

  if (typesMajor > engineMajor || (typesMajor === engineMajor && typesMinor > engineMinor)) {
    throw new Error(
      `@types/vscode version ${typesVersion} is higher than the specified engine version ${engineVersion}`,
    );
  }
}

export type ManifestValidation =
  | { type: "MISSING_FIELD"; field: string; message: string }
  | { type: "INVALID_VSCODE_ENGINE_COMPATIBILITY"; field: string; message: string }
  | { type: "INVALID_VALUE"; field: string; message: string }
  | { type: "INVALID_PRICING"; message: string; value: string }
  | { type: "VSCODE_TYPES_INCOMPATIBILITY"; message: string }
  | { type: "INVALID_ICON"; field: string; message: string }
  | { type: "INVALID_BADGE_URL"; field: string; message: string }
  | { type: "UNTRUSTED_HOST"; field: string; message: string }
  | { type: "DEPENDS_ON_VSCODE_IN_DEPENDENCIES"; field: string; message: string }
  | { type: "INVALID_EXTENSION_KIND"; field: string; message: string }
  | { type: "INVALID_SPONSOR_URL"; field: string; message: string };

export const ALLOWED_SPONSOR_PROTOCOLS = ["http:", "https:"];
export const VALID_EXTENSION_KINDS = ["ui", "workspace"];
export const EXTENSION_PRICING = ["Free", "Trial"];
export const EXTENSION_NAME_REGEX = /^[a-z0-9][a-z0-9\-]*$/i;
export const VSCODE_ENGINE_COMPATIBILITY_REGEX
  = /^\*$|^(\^|>=)?((\d+)|x)\.((\d+)|x)\.((\d+)|x)(-.*)?$/;
export const GITHUB_BADGE_URL_REGEX
  = /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions\/)?workflows\/.*badge\.svg/;

/**
 * Validates a partial manifest object for required fields and valid sponsor URL.
 *
 * @param {Partial<Manifest>} manifest - The partial manifest object to validate
 * @returns {Promise<ManifestValidation[] | null>} A promise that resolves to either:
 * - `null` if validation passes with no errors
 * - An array of {@link ManifestValidation} objects describing validation errors
 */
export async function validateProjectManifest(
  manifest: Partial<Manifest>,
): Promise<ManifestValidation[] | null> {
  const errors: ManifestValidation[] = [];

  if (manifest.name == null) {
    errors.push({
      field: "name",
      message: "The `name` field is required.",
      type: "MISSING_FIELD",
    });
  }

  if (manifest.version == null) {
    errors.push({
      field: "version",
      message: "The `version` field is required.",
      type: "MISSING_FIELD",
    });
  }

  if (manifest.publisher == null) {
    errors.push({
      field: "publisher",
      message: "The `publisher` field is required.",
      type: "MISSING_FIELD",
    });
  }

  if (manifest.engines == null) {
    errors.push({
      field: "engines",
      message: "The `engines` field is required.",
      type: "MISSING_FIELD",
    });
  }

  if (manifest.engines?.vscode == null) {
    errors.push({
      field: "engines.vscode",
      message: "The `engines.vscode` field is required.",
      type: "MISSING_FIELD",
    });
  }

  const vscodeEngineVersion = manifest.engines?.vscode ?? "";

  if (!VSCODE_ENGINE_COMPATIBILITY_REGEX.test(vscodeEngineVersion)) {
    errors.push({
      type: "INVALID_VALUE",
      field: "engines.vscode",
      message:
        "The `engines.vscode` field must be a valid semver version range, or 'x' for any version.",
    });
  }

  const engines = { ...(manifest.engines || {}), vscode: vscodeEngineVersion };
  const name = manifest.name || "";

  if (!EXTENSION_NAME_REGEX.test(name)) {
    errors.push({
      type: "INVALID_VALUE",
      field: "name",
      message: "The `name` field should be an identifier and not its human-friendly name.",
    });
  }

  const version = manifest.version || "";

  if (valid(version) == null) {
    errors.push({
      type: "INVALID_VALUE",
      field: "version",
      message: "The `version` field must be a valid semver version.",
    });
  }

  const publisher = manifest.publisher || "";

  if (!EXTENSION_NAME_REGEX.test(publisher)) {
    errors.push({
      type: "INVALID_VALUE",
      field: "publisher",
      message: "The `publisher` field should be an identifier and not its human-friendly name.",
    });
  }

  if (manifest.pricing && !EXTENSION_PRICING.includes(manifest.pricing)) {
    errors.push({
      type: "INVALID_PRICING",
      value: manifest.pricing,
      message: "The `pricing` field must be either 'Free' or 'Paid'.",
    });
  }

  const hasActivationEvents = !!manifest.activationEvents;
  const hasImplicitLanguageActivationEvents = manifest.contributes?.languages;
  const hasOtherImplicitActivationEvents
    = manifest.contributes?.commands
    || manifest.contributes?.authentication
    || manifest.contributes?.customEditors
    || manifest.contributes?.views;
  const hasImplicitActivationEvents
    = hasImplicitLanguageActivationEvents || hasOtherImplicitActivationEvents;

  const hasMain = !!manifest.main;
  const hasBrowser = !!manifest.browser;

  if (
    hasActivationEvents
    || ((vscodeEngineVersion === "*"
      || satisfies(vscodeEngineVersion, ">=1.74", { includePrerelease: true }))
    && hasImplicitActivationEvents)
  ) {
    if (!hasMain && !hasBrowser && (hasActivationEvents || !hasImplicitLanguageActivationEvents)) {
      errors.push(
        {
          type: "MISSING_FIELD",
          field: "main",
          message:
            "The use of `activationEvents` field requires either `browser` or `main` to be set.",
        },
        {
          type: "MISSING_FIELD",
          field: "browser",
          message:
            "The use of `activationEvents` field requires either `browser` or `main` to be set.",
        },
      );
    }
  } else if (hasMain) {
    errors.push({
      type: "MISSING_FIELD",
      field: "activationEvents",
      message: "Manifest needs the 'activationEvents' property, given it has a 'main' property.",
    });
  } else if (hasBrowser) {
    errors.push({
      type: "MISSING_FIELD",
      field: "activationEvents",
      message: "Manifest needs the 'activationEvents' property, given it has a 'browser' property.",
    });
  }

  if (manifest.devDependencies != null && manifest.devDependencies["@types/vscode"] != null) {
    try {
      validateVSCodeTypesCompatability(engines.vscode, manifest.devDependencies["@types/vscode"]);
    } catch {
      errors.push({
        type: "VSCODE_TYPES_INCOMPATIBILITY",
        message: "@types/vscode version is either higher than the specified engine version or invalid",
      });
    }
  }

  if (manifest.icon?.endsWith(".svg")) {
    errors.push({
      type: "INVALID_ICON",
      field: "icon",
      message: "SVG icons are not supported. Use PNG icons instead.",
    });
  }

  if (manifest.badges != null) {
    for (const badge of manifest.badges) {
      const decodedUrl = decodeURI(badge.url);
      let srcURL: URL | null = null;

      try {
        srcURL = new URL(decodedUrl);
      } catch {
        errors.push({
          type: "INVALID_BADGE_URL",
          field: "badges",
          message: `The badge URL '${decodedUrl}' must be a valid URL.`,
        });
      }

      if (!decodedUrl.startsWith("https://")) {
        errors.push({
          type: "INVALID_BADGE_URL",
          field: "badges",
          message: "Badge URL must use the 'https' protocol",
        });
      }

      if (decodedUrl.endsWith(".svg")) {
        errors.push({
          type: "INVALID_BADGE_URL",
          field: "badges",
          message: "SVG badges are not supported. Use PNG badges instead",
        });
      }

      if (
        srcURL
        && !(
          (srcURL.host != null && VSCE_TRUSTED_SOURCES.includes(srcURL.host.toLowerCase()))
          || GITHUB_BADGE_URL_REGEX.test(srcURL.href)
        )
      ) {
        errors.push({
          type: "UNTRUSTED_HOST",
          field: "badges",
          message: "Badge URL must use a trusted host",
        });
      }
    }
  }

  if (manifest.dependencies != null && manifest.dependencies.vscode != null) {
    errors.push({
      type: "DEPENDS_ON_VSCODE_IN_DEPENDENCIES",
      field: "dependencies.vscode",
      message: `You should not depend on 'vscode' in your 'dependencies'. Did you mean to add it to 'devDependencies'?`,
    });
  }

  if (manifest.extensionKind != null) {
    const extensionKinds = Array.isArray(manifest.extensionKind)
      ? manifest.extensionKind
      : [manifest.extensionKind];

    for (const extensionKind of extensionKinds) {
      if (!VALID_EXTENSION_KINDS.includes(extensionKind)) {
        errors.push({
          type: "INVALID_EXTENSION_KIND",
          field: "extensionKind",
          message: `Invalid extension kind '${extensionKind}'. Expected one of: ${VALID_EXTENSION_KINDS.join(", ")}`,
        });
      }
    }
  }

  if (manifest.sponsor != null && manifest.sponsor.url != null) {
    try {
      const sponsorUrl = new URL(manifest.sponsor.url);

      if (!ALLOWED_SPONSOR_PROTOCOLS.includes(sponsorUrl.protocol)) {
        errors.push({
          type: "INVALID_SPONSOR_URL",
          field: "sponsor.url",
          message: `The protocol '${sponsorUrl.protocol.slice(0, sponsorUrl.protocol.lastIndexOf(":"))}' is not allowed. Use one of: ${ALLOWED_SPONSOR_PROTOCOLS.map((protocol) => protocol.slice(0, protocol.lastIndexOf(":"))).join(", ")}`,
        });
      }
    } catch {
      errors.push({
        type: "INVALID_SPONSOR_URL",
        field: "sponsor.url",
        message: "The `sponsor.url` field must be a valid URL.",
      });
    }
  }

  if (errors.length === 0) {
    return null;
  }

  return errors;
}

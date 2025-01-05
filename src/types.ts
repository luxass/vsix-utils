/**
 * @module types
 *
 * This module contains type definitions that are shared across multiple modules.
 */

/**
 * The package manager to use.
 */
export type PackageManager = "npm" | "yarn" | "pnpm";

/**
 * Specifies the package manager to use, or automatically detect it.
 */
export type PackageManagerWithAuto = PackageManager | "auto";

/**
 * The pricing of an extension.
 */
export type ExtensionPricing = "Free" | "Trial";

/**
 * Represents a person associated with the extension.
 */
export interface Person {
  /**
   * The full name of the person
   */
  name: string;

  /**
   * The website or personal page of the person
   * Optional URL where more information about the person can be found
   */
  url?: string;

  /**
   * The contact email address of the person
   * Optional email for reaching out to the person
   */
  email?: string;
}

export interface Translation {
  id: string;
  path: string;
}

export interface Localization {
  languageId: string;
  languageName?: string;
  localizedLanguageName?: string;
  translations: Translation[];
}

export interface Language {
  readonly id: string;
  readonly aliases?: string[];
  readonly extensions?: string[];
}

export interface Grammar {
  readonly language: string;
  readonly scopeName: string;
  readonly path: string;
}

export interface Command {
  readonly command: string;
  readonly title: string;
}

export interface Authentication {
  readonly id: string;
  readonly label: string;
}

export interface CustomEditor {
  readonly viewType: string;
  readonly priority: string;
  readonly selector: readonly {
    readonly filenamePattern?: string;
  }[];
}

export interface View {
  readonly id: string;
  readonly name: string;
}

export interface Contributions {
  readonly localizations?: Localization[];
  readonly languages?: Language[];
  readonly grammars?: Grammar[];
  readonly commands?: Command[];
  readonly authentication?: Authentication[];
  readonly customEditors?: CustomEditor[];
  readonly views?: { [location: string]: View[] };
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  readonly [contributionType: string]: any;
}

/**
 * The kind of extension.
 */
export type ExtensionKind = "ui" | "workspace" | "web";

export type ExtensionCategory =
  | "AI"
  | "Azure"
  | "Chat"
  | "Data Science"
  | "Debuggers"
  | "Extension Packs"
  | "Education"
  | "Formatters"
  | "Keymaps"
  | "Language Packs"
  | "Linters"
  | "Machine Learning"
  | "Notebooks"
  | "Programming Languages"
  | "SCM Providers"
  | "Snippets"
  | "Testing"
  | "Themes"
  | "Visualization"
  | "Other";

/**
 * The manifest of an extension.
 *
 * This is a subset of the official `package.json` schema,
 * with additional fields that are specific to Visual Studio Code extensions.
 */
export interface Manifest {
  /**
   * The name of the extension.
   *
   * NOTE:
   * This is mandatory for npm packages, and therefore is mandatory here.
   */
  name: string;

  /**
   * The version of the extension.
   *
   * NOTE:
   * This is mandatory for npm packages, and therefore is mandatory here.
   */
  version: string;

  /**
   * Engines
   */
  engines: Record<string, string>;

  /**
   * The publisher of the extension.
   */
  publisher: string;

  /**
   * Icon of the extension.
   */
  icon?: string;

  contributes?: Contributions;

  /**
   * The activation events of the extension.
   */
  activationEvents?: string[];

  /**
   * The extension dependencies of the extension.
   */
  extensionDependencies?: string[];

  extensionPack?: string[];
  galleryBanner?: { color?: string; theme?: string };
  preview?: boolean;
  badges?: { url: string; href: string; description: string }[];

  markdown?: "github" | "standard";

  _bundling?: { [name: string]: string }[];
  _testing?: string;

  enableProposedApi?: boolean;

  /**
   * List of proposed API proposals that are enabled.
   * @default []
   */
  enabledApiProposals?: readonly string[];

  /**
   * QnA of the extension
   * @default "marketplace"
   */
  qna?: "marketplace" | string | false;

  /**
   * The kind of extension.
   */
  extensionKind?: ExtensionKind[] | ExtensionKind;

  /**
   * Sponsor URL of the extension.
   */
  sponsor?: { url: string };

  /**
   * The author of the extension.
   */
  author?: string | Person;

  /**
   * The display name of the extension.
   */
  displayName?: string;

  /**
   * The description of the extension.
   */
  description?: string;

  /**
   * The keywords of the extension.
   */
  keywords?: string[];

  /**
   * The categories of the extension.
   */
  categories?: ExtensionCategory[];

  /**
   * The homepage of the extension.
   */
  homepage?: string;

  /**
   * The bugs URL or email of the extension.
   */
  bugs?: string | { url?: string; email?: string };

  /**
   * The license of the extension.
   */
  license?: string;

  /**
   * List of contributors of the extension.
   */
  contributors?: string | Person[];

  /**
   * The main entrypoint of the extension.
   */
  main?: string;

  /**
   * The browser entrypoint of the extension.
   */
  browser?: string;

  /**
   * The repository of the extension.
   */
  repository?: string | { type?: string; url?: string };

  /**
   * The scripts of the extension.
   */
  scripts?: Record<string, string>;

  /**
   * The dependencies of the extension.
   */
  dependencies?: Record<string, string>;

  /**
   * The devDependencies of the extension.
   */
  devDependencies?: Record<string, string>;

  private?: boolean;

  /**
   * The pricing to use for the extension.
   */
  pricing?: ExtensionPricing;
}

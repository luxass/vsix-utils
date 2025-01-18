import type { Manifest } from "./types";
import { remark } from "remark";
import remarkTransformLinks from "remark-transform-links";

export interface TransformMarkdownOptions {
  /**
   * The markdown content to transform.
   */
  content: string;

  /**
   * Prepend all relative links in README.md with the specified URL.
   */
  baseContentUrl?: string;

  /**
   * Prepend all relative image links in README.md with the specified URL.
   */
  baseImagesUrl?: string;

  /**
   * Whether to rewrite the markdown content.
   * @default true
   */
  rewrite?: boolean;

  /**
   * The branch to use for the base URLs.
   * @default "HEAD"
   */
  branch?: string;
}

export async function transformMarkdown(manifest: Manifest, options: TransformMarkdownOptions): Promise<string> {
  const {
    content,
    rewrite = true,
    branch = "HEAD",
  } = options;

  if (!rewrite) {
    return content;
  }

  let { baseContentUrl, baseImagesUrl } = options;

  const baseUrls = inferBaseUrls(manifest, branch);

  if (baseUrls == null) {
    throw new Error("Couldn't detect the repository where this extension is published.");
  }

  if (baseContentUrl == null) {
    baseContentUrl = baseUrls.contentUrl;
  }

  if (baseImagesUrl == null) {
    baseImagesUrl = baseUrls.imagesUrl;
  }

  const detectedSyntax = detectMarkdownSyntax(content);

  const file = await remark()
    .data("settings", {
      bullet: detectedSyntax.bullet,
      bulletOrdered: detectedSyntax.bulletOrdered,
      emphasis: detectedSyntax.emphasis,
      listItemIndent: detectedSyntax.listItemIndent,
      fence: detectedSyntax.fence,
      strong: detectedSyntax.strong,
      rule: detectedSyntax.rule,
    })
    .use(remarkTransformLinks, {
      baseUrl(_, type) {
        if (type === "image" || type === "html_img" || type === "html_video") {
          return baseImagesUrl;
        }

        return baseContentUrl;
      },
    })
    .process(content);

  return String(file);
}

export interface InferredBaseUrls {
  contentUrl: string;
  imagesUrl: string;
}

export function inferBaseUrls(manifest: Manifest, branch?: string): InferredBaseUrls | null {
  let repository = null;

  if (typeof manifest.repository === "string") {
    repository = manifest.repository;
  } else if (manifest.repository && typeof manifest.repository === "object" && "url" in manifest.repository && typeof manifest.repository.url === "string") {
    repository = manifest.repository.url;
  }

  if (!repository) {
    return null;
  }

  // we expect this is a ssh url
  if (repository.startsWith("git@")) {
    repository = repository.replace(":", "/").replace("git@", "https://");
  }

  let url;

  try {
    url = new URL(repository);
  } catch {
    return null;
  }

  // slice at 1 to remove the leading slash and 3 to remove everything after the repo name
  const ownerWithRepo = url.pathname.split("/").slice(1, 3).join("/").replace(/\.git$/, "");

  const branchName = branch ?? "HEAD";

  if (url.hostname === "github.com") {
    return {
      contentUrl: `https://github.com/${ownerWithRepo}/blob/${branchName}`,
      imagesUrl: `https://github.com/${ownerWithRepo}/raw/${branchName}`,
    };
  }

  if (url.hostname === "gitlab.com") {
    return {
      contentUrl: `https://gitlab.com/${ownerWithRepo}/-/blob/${branchName}`,
      imagesUrl: `https://gitlab.com/${ownerWithRepo}/-/raw/${branchName}`,
    };
  }

  if (url.hostname === "gitea.com") {
    return {
      contentUrl: `https://gitea.com/${ownerWithRepo}/src/branch/${branchName}`,
      imagesUrl: `https://gitea.com/${ownerWithRepo}/raw/branch/${branchName}`,
    };
  }

  return null;
}

export interface DetectedMarkdownSyntax {
  bullet?: "-" | "+" | "*";
  bulletOrdered?: "." | ")";
  emphasis?: "_" | "*";
  strong?: "_" | "*";
  fence?: "`" | "~";
  listItemIndent?: "tab" | "one" | "mixed";
  rule?: "*" | "-" | "_";
}

/**
 * Analyzes markdown content and detects the syntax patterns used.
 *
 * @param {string} content - The markdown string to analyze
 * @returns {DetectedMarkdownSyntax} An object containing detected markdown syntax preferences with the following properties:
 * - `bullet`: The bullet style used for unordered lists ("-", "*", or "+")
 * - `bulletOrdered`: The marker style used for ordered lists ("." or ")")
 * - `emphasis`: The emphasis marker style ("*" or "_")
 * - `strong`: The strong emphasis marker style ("*" or "_")
 * - `fence`: The code fence style ("`" or "~")
 * - `listItemIndent`: The indentation style for list items ("tab", "one", "mixed")
 * - `rule`: The horizontal rule style ("*", "-", or "_")
 *
 * @example
 * ```ts
 * const markdown = `
 *  - List item
 *  - Another item
 * `;
 *
 * detectMarkdownSyntax(content) // Returns { bullet: "-", listItemIndent: "one" }
 * ```
 */
export function detectMarkdownSyntax(content: string): DetectedMarkdownSyntax {
  const result: DetectedMarkdownSyntax = {};

  const hyphenBullets = content.match(/^[\t ]*-[\t ][^\n]+/gm);
  const asteriskBullets = content.match(/^[\t ]*\*[\t ][^\n]+/gm);
  const plusBullets = content.match(/^[\t ]*\+[\t ][^\n]+/gm);

  if (hyphenBullets?.length) result.bullet = "-";
  else if (asteriskBullets?.length) result.bullet = "*";
  else if (plusBullets?.length) result.bullet = "+";

  // Ordered list marker detection
  const dotOrdered = content.match(/^\s*\d+\.[\t ][^\n]+/gm);
  const parenthesisOrdered = content.match(/^\s*\d+\)[\t ][^\n]+/gm);

  if (dotOrdered?.length) result.bulletOrdered = ".";
  else if (parenthesisOrdered?.length) result.bulletOrdered = ")";

  // Emphasis style detection
  const asteriskEmphasis = content.match(/(?<!\*)\*[^*\n]+\*(?!\*)/g);
  const underscoreEmphasis = content.match(/(?<!_)_[^_\n]+_(?!_)/g);

  if (asteriskEmphasis?.length) result.emphasis = "*";
  else if (underscoreEmphasis?.length) result.emphasis = "_";

  // Strong emphasis detection
  const asteriskStrong = content.match(/\*\*[^*\n]+\*\*/g);
  const underscoreStrong = content.match(/__[^_\n]+__/g);

  if (asteriskStrong?.length) result.strong = "*";
  else if (underscoreStrong?.length) result.strong = "_";

  // Code fence detection
  const backtickFence = content.match(/^```[^`]*```/gm);
  const tildeFence = content.match(/^~~~[^~]*~~~/gm);

  if (backtickFence?.length) result.fence = "`";
  else if (tildeFence?.length) result.fence = "~";

  // List item indentation detection
  const listItems = content.match(/^[\t ]*([-+*]|\d+[.)])\s+[^\n]+/gm);
  if (listItems?.length) {
    const indentTypes = new Set(
      listItems.map((item) => {
        const leadingSpace = item.match(/^[\t ]*/)?.[0] || "";
        if (leadingSpace.includes("\t")) return "tab";
        return leadingSpace.length === 1 ? "one" : leadingSpace.length > 1 ? "mixed" : "one";
      }),
    );

    if (indentTypes.size === 1) {
      result.listItemIndent = indentTypes.values().next().value;
    } else {
      result.listItemIndent = "mixed";
    }
  }

  // Horizontal rule detection
  const asteriskRule = content.match(/^[\t ]*(\*[\t ]*){3,}$/m);
  const hyphenRule = content.match(/^[\t ]*(-[\t ]*){3,}$/m);
  const underscoreRule = content.match(/^[\t ]*(_[\t ]*){3,}$/m);

  if (asteriskRule?.length) result.rule = "*";
  else if (hyphenRule?.length) result.rule = "-";
  else if (underscoreRule?.length) result.rule = "_";

  return result;
}

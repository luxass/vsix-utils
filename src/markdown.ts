import type { Manifest } from "./types";
import { remark } from "remark";
import remarkTransformLinks from "remark-transform-links";

export interface MarkdownOptions {
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

export async function transformMarkdown(manifest: Manifest, options: MarkdownOptions): Promise<string> {
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
 * Detects and extracts markdown syntax preferences from a given content string.
 *
 * @param {string} content - The markdown content to analyze
 * @returns {DetectedMarkdownSyntax} An object containing detected markdown syntax preferences:
 * - `bullet`: The unordered list bullet style (`-`, `+`, or `*`)
 * - `bulletOrdered`: The ordered list marker style (`.` or `)`)
 * - `emphasis`: The emphasis marker style (`_` or `*`)
 * - `strong`: The strong emphasis style (`_` or `*`)
 * - `fence`: The code fence style (``` ` ``` or `~`)
 * - `listItemIndent`: The list item indentation style (`"one"`, `"tab"`, or `"mixed"`)
 * - `rule`: The rule style (`*`, `-`, or `_`)
 *
 * @example
 * ```ts
 * const syntax = detectMarkdownSyntax("* List item\n**bold text**");
 * // Returns: { bullet: "*", strong: "**" }
 * ```
 */
export function detectMarkdownSyntax(content: string): DetectedMarkdownSyntax {
  const style: DetectedMarkdownSyntax = {};

  // detect unordered list bullet style
  const bulletMatch = content.match(/^[ \t]*([*+-])\s/m);
  if (bulletMatch) {
    style.bullet = bulletMatch[1] as "-" | "+" | "*";
  }

  // detect ordered list marker style
  const orderedMatch = content.match(/^[ \t]*\d+([.)]) /m);
  if (orderedMatch) {
    style.bulletOrdered = orderedMatch[1] as "." | ")";
  }

  // detect emphasis style
  const emphasisMatch = content.match(/([*_])\w+\1/);
  if (emphasisMatch) {
    style.emphasis = emphasisMatch[1] as "_" | "*";
  }

  // detect strong style
  const strongMatch = content.match(/([*_]{2})\w+\1/);
  if (strongMatch) {
    style.strong = strongMatch[1] as "_" | "*";
  }

  // detect code fence style
  const fenceMatch = content.match(/^([`~]{3,})/m);
  if (fenceMatch) {
    style.fence = fenceMatch[1]![0] as "`" | "~";
  }

  // detect list item indentation
  const listIndentMatch = content.match(/^( {1,4}|\t)[*+-]/m);
  if (listIndentMatch) {
    style.listItemIndent = listIndentMatch[1]!.length === 2
      ? "one"
      : listIndentMatch[1] === "\t" ? "tab" : "mixed";
  }

  // detect rule style
  const ruleMatch = content.match(/^([*\-_]{3,})/m);
  if (ruleMatch) {
    style.rule = ruleMatch[1]![0] as "*" | "-" | "_";
  }

  return style;
}

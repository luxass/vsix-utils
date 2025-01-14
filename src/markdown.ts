import type { Manifest } from "./types";
import { remark } from "remark";
import remarkTransformLinks from "remark-transform-links";

export interface MarkdownOptions {

  /**
   * The manifest of the extension.
   */
  manifest: Manifest;

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

export async function transformMarkdown(options: MarkdownOptions): Promise<string> {
  const {
    content,
    rewrite = true,
    branch = "HEAD",
  } = options;

  if (!rewrite) {
    return content;
  }

  let { baseContentUrl, baseImagesUrl } = options;

  const baseUrls = inferBaseUrls(options.manifest, branch);

  if (baseUrls == null) {
    throw new Error("Couldn't detect the repository where this extension is published.");
  }

  if (baseContentUrl == null) {
    baseContentUrl = baseUrls.contentUrl;
  }

  if (baseImagesUrl == null) {
    baseImagesUrl = baseUrls.imagesUrl;
  }

  const file = await remark()
    .use(remarkTransformLinks, {
      baseUrl(path, type) {
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

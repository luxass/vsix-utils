import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { detectMarkdownSyntax, inferBaseUrls, transformMarkdown } from "../src/markdown";
import { createManifest } from "./utils";

describe("transformMarkdown", () => {
  it("transform relative links", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    const manifest = createManifest({
      repository: "https://github.com/luxass/vsix-utils.git",
    });

    const transformed = await transformMarkdown(manifest, {
      content,
    });

    expect(transformed).toMatchSnapshot();
  });

  it("transform relative links with custom base URLs", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    const manifest = createManifest({
      repository: "https://github.com/luxass/vsix-utils.git",
    });

    const transformed = await transformMarkdown(manifest, {
      content,
      baseContentUrl: "https://github.com/luxass/luxass.dev",
      baseImagesUrl: "https://github.com/luxass/luxass.dev",
    });

    expect(transformed).toMatchSnapshot();
  });

  it("should throw an error if the repository is not detected", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    const manifest = createManifest();

    await expect(() =>
      transformMarkdown(manifest, {
        content,
      }),
    ).rejects.toThrowError("Couldn't detect the repository where this extension is published.");
  });
});

describe("inferBaseUrls", () => {
  it("should handle GitHub HTTPS URLs", () => {
    const manifest = createManifest({
      repository: "https://github.com/luxass/vsix-utils.git",
    });

    const urls = inferBaseUrls(manifest, "HEAD");

    expect(urls).toEqual({
      contentUrl: "https://github.com/luxass/vsix-utils/blob/HEAD",
      imagesUrl: "https://github.com/luxass/vsix-utils/raw/HEAD",
    });
  });

  it("should handle GitHub SSH URLs", () => {
    const manifest = createManifest({
      repository: "git@github.com:luxass/vsix-utils.git",
    });

    const urls = inferBaseUrls(manifest, "HEAD");

    expect(urls).toEqual({
      contentUrl: "https://github.com/luxass/vsix-utils/blob/HEAD",
      imagesUrl: "https://github.com/luxass/vsix-utils/raw/HEAD",
    });
  });

  it("should handle GitLab URLs", () => {
    const manifest = createManifest({
      repository: "https://gitlab.com/luxass/vsix-utils.git",
    });

    const urls = inferBaseUrls(manifest, "HEAD");

    expect(urls).toEqual({
      contentUrl: "https://gitlab.com/luxass/vsix-utils/-/blob/HEAD",
      imagesUrl: "https://gitlab.com/luxass/vsix-utils/-/raw/HEAD",
    });
  });

  it("should handle repository object format", () => {
    const manifest = createManifest({
      repository: {
        type: "git",
        url: "https://github.com/luxass/vsix-utils.git",
      },
    });

    const urls = inferBaseUrls(manifest, "HEAD");

    expect(urls).toEqual({
      contentUrl: "https://github.com/luxass/vsix-utils/blob/HEAD",
      imagesUrl: "https://github.com/luxass/vsix-utils/raw/HEAD",
    });
  });

  it("should return null for invalid repository", () => {
    const manifest = createManifest({
      repository: "invalid-url",
    });

    const urls = inferBaseUrls(manifest, "HEAD");

    expect(urls).toBeNull();
  });
});

describe("detectMarkdownSyntax", () => {
  it("should detect unordered list bullet style", () => {
    expect(detectMarkdownSyntax("* List item")).toEqual({ bullet: "*", listItemIndent: "one" });
    expect(detectMarkdownSyntax("- List item")).toEqual({ bullet: "-", listItemIndent: "one" });
    expect(detectMarkdownSyntax("+ List item")).toEqual({ bullet: "+", listItemIndent: "one" });
  });

  it("should detect ordered list marker style", () => {
    expect(detectMarkdownSyntax("1. First item")).toEqual({ bulletOrdered: ".", listItemIndent: "one" });
    expect(detectMarkdownSyntax("1) First item")).toEqual({ bulletOrdered: ")", listItemIndent: "one" });
  });

  it("should detect emphasis style", () => {
    expect(detectMarkdownSyntax("*italic*")).toEqual({ emphasis: "*" });
    expect(detectMarkdownSyntax("_italic_")).toEqual({ emphasis: "_" });
  });

  it("should detect strong emphasis style", () => {
    expect(detectMarkdownSyntax("**bold**")).toEqual({ strong: "*" });
    expect(detectMarkdownSyntax("__bold__")).toEqual({ strong: "_" });
  });

  it("should detect code fence style", () => {
    expect(detectMarkdownSyntax("```code```")).toEqual({ fence: "`" });
    expect(detectMarkdownSyntax("~~~code~~~")).toEqual({ fence: "~" });
  });

  it("should detect list item indentation", () => {
    expect(detectMarkdownSyntax("  * List")).toEqual({ bullet: "*", listItemIndent: "mixed" });
    expect(detectMarkdownSyntax("\t* List")).toEqual({ bullet: "*", listItemIndent: "tab" });
    expect(detectMarkdownSyntax("   * List")).toEqual({ bullet: "*", listItemIndent: "mixed" });
  });

  it("should detect horizontal rule style", () => {
    expect(detectMarkdownSyntax("***")).toEqual({ rule: "*" });
    expect(detectMarkdownSyntax("---")).toEqual({ rule: "-" });
    expect(detectMarkdownSyntax("___")).toEqual({ rule: "_" });
  });

  it("should detect multiple syntax elements", () => {
    const content = `
* List item
**bold text**
---
`;
    expect(detectMarkdownSyntax(content)).toEqual({
      bullet: "*",
      strong: "*",
      rule: "-",
      listItemIndent: "one",
    });
  });

  it("should return empty object for no matches", () => {
    expect(detectMarkdownSyntax("Plain text")).toEqual({});
  });
});

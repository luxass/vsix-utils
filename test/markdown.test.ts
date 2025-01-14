import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { inferBaseUrls, transformMarkdown } from "../src/markdown";
import { createManifest } from "./utils";

describe("transformMarkdown", () => {
  it("transform relative links", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    const transformed = await transformMarkdown({
      content,
      manifest: createManifest({
        repository: "https://github.com/luxass/vsix-utils.git",
      }),
    });

    expect(transformed).toMatchSnapshot();
  });

  it("transform relative links with custom base URLs", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    const transformed = await transformMarkdown({
      content,
      manifest: createManifest({
        repository: "https://github.com/luxass/vsix-utils.git",
      }),
      baseContentUrl: "https://github.com/luxass/luxass.dev",
      baseImagesUrl: "https://github.com/luxass/luxass.dev",
    });

    expect(transformed).toMatchSnapshot();
  });

  it("should throw an error if the repository is not detected", async () => {
    const content = await readFile("./test/fixtures/markdown/README.md", "utf-8");

    expect(content).toBeDefined();

    await expect(() =>
      transformMarkdown({
        content,
        manifest: createManifest(),
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

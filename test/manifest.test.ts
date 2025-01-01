import { describe, expect, it } from "vitest";
import { testdir } from "vitest-testdirs";
import { readProjectManifest, transformExtensionKind } from "../src/manifest";
import { createManifest } from "./utils";

describe("read project manifest", () => {
  it("should read and parse the project manifest", async () => {
    const path = await testdir({
      "package.json": JSON.stringify({ name: "test-project", version: "1.0.0" }),
    });

    const result = await readProjectManifest(path);

    expect(result).toEqual({
      fileName: `${path}/package.json`,
      manifest: { name: "test-project", version: "1.0.0" },
    });
  });

  it("should return null if the manifest file does not exist", async () => {
    const path = await testdir({
      "README.md": "This is not a json file!",
    });

    const result = await readProjectManifest(path);

    expect(result).toBeNull();
  });

  it("should return null if the manifest file is not a valid JSON", async () => {
    const path = await testdir({
      "package.json": "invalid JSON",
    });

    const result = await readProjectManifest(path);

    expect(result).toBeNull();
  });
});

describe("transform extension kinds", () => {
  it("should handle explicit extension kinds", () => {
    expect(transformExtensionKind(createManifest({
      extensionKind: ["ui"],
    })))
      .toEqual(["ui"]);

    expect(transformExtensionKind(createManifest({
      extensionKind: ["workspace"],
      browser: "dist/web.js",
    }))).toEqual(["workspace", "web"]);

    expect(transformExtensionKind(createManifest({ extensionKind: "ui" })))
      .toEqual(["ui", "workspace"]);
  });

  it("should handle main and browser fields", () => {
    expect(transformExtensionKind(createManifest({
      main: "dist/extension.js",
      browser: "dist/web.js",
    }))).toEqual(["workspace", "web"]);

    expect(transformExtensionKind(createManifest({
      main: "dist/extension.js",
    }))).toEqual(["workspace"]);

    expect(transformExtensionKind(createManifest({
      browser: "dist/web.js",
    }))).toEqual(["web"]);
  });

  it("should handle extension packs and dependencies", () => {
    expect(transformExtensionKind(createManifest({
      extensionPack: ["@foo/bar"],
    }))).toEqual(["workspace", "web"]);

    expect(transformExtensionKind(createManifest({
      extensionDependencies: ["@foo/bar"],
    }))).toEqual(["workspace", "web"]);
  });

  it("should handle no extension kinds", () => {
    const manifest = createManifest({});

    const result = transformExtensionKind(manifest);

    expect(result).toEqual(["ui", "workspace", "web"]);
  });

  describe("contributes", () => {
    it.each([
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
    ])("should handle %s inside contributes", (key, expected) => {
      const manifest = createManifest({
        contributes: { [key]: {} },
      });

      const result = transformExtensionKind(manifest);

      expect(result).toEqual(expected);
    });
  });
});

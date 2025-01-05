import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

import { assert, describe, expect, it } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { collect, getContentTypesForFiles, type VsixFile } from "../src/files";
import { readProjectManifest } from "../src/manifest";

it("should collect files for a simple extension", async () => {
  const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension");
  const path = await testdir(testdirFiles);

  const projectManifest = await readProjectManifest(path);

  if (projectManifest == null) {
    expect.fail("project manifest is null");
  }

  const { manifest } = projectManifest;

  const files = await collect(manifest, {
    cwd: path,
  });

  assert(manifest.displayName === "Simple Extension", "displayName should be 'Simple Extension'");
  assert(files.length > 0, "files should not be empty");

  expect(files).toMatchObject(expect.arrayContaining([
    {
      type: "local",
      path: normalize("extension/package.json"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/package.json"),
    },
    {
      type: "local",
      path: normalize("extension/README.md"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/README.md"),
    },
    {
      type: "local",
      path: normalize("extension/LICENSE"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/LICENSE"),
    },
  ] satisfies VsixFile[]));
});

it("should collect files for a extension with a different README path", async () => {
  const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension", {
    extras: {
      "extra-readme.md": "This is an extra README file",
    },
  });

  const path = await testdir(testdirFiles);

  const projectManifest = await readProjectManifest(path);

  if (projectManifest == null) {
    expect.fail("project manifest is null");
  }

  const { manifest } = projectManifest;

  const files = await collect(manifest, {
    cwd: path,
    readme: "extra-readme.md",
  });

  const readmeContent = await readFile(join(path, "extra-readme.md"), "utf8");

  assert(manifest.displayName === "Simple Extension", "displayName should be 'Simple Extension'");
  assert(files.length > 0, "files should not be empty");

  expect(files).toMatchObject(expect.arrayContaining([
    {
      type: "local",
      path: normalize("extension/package.json"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/package.json"),
    },
    {
      type: "local",
      path: normalize("extension/README.md"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/README.md"),
    },
    {
      type: "local",
      path: normalize("extension/LICENSE"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/LICENSE"),
    },
  ] satisfies VsixFile[]));

  expect(readmeContent).toBe("This is an extra README file");
});

it("should collect files for a extension with a different ignore file", async () => {
  const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension", {
    extras: {
      ".vsixignore": ".vscode/**\n.gitignore\n**/tsconfig.json",
    },
  });

  const path = await testdir(testdirFiles);

  const projectManifest = await readProjectManifest(path);

  if (projectManifest == null) {
    expect.fail("project manifest is null");
  }

  const { manifest } = projectManifest;

  const files = await collect(manifest, {
    cwd: path,
    ignoreFile: ".vsixignore",
  });

  assert(manifest.displayName === "Simple Extension", "displayName should be 'Simple Extension'");
  assert(files.length > 0, "files should not be empty");

  expect(files).toMatchObject(expect.arrayContaining([
    {
      type: "local",
      path: normalize("extension/package.json"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/package.json"),
    },
    {
      type: "local",
      path: normalize("extension/README.md"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/README.md"),
    },
    {
      type: "local",
      path: normalize("extension/LICENSE"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/LICENSE"),
    },
    {
      type: "local",
      path: normalize("extension/src/extension.ts"),
      localPath: normalize(".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/src/extension.ts"),
    },
  ] satisfies VsixFile[]));
});

describe("content types", () => {
  it("should handle empty input", () => {
    const result = getContentTypesForFiles([]);

    expect(result.contentTypes).toEqual({});
    expect(result.xml).not.toContain("<Default");
  });

  it("should assign default content types for known extensions", () => {
    const result = getContentTypesForFiles([
      {
        type: "local",
        path: "file.txt",
        localPath: "file.txt",
      },
      {
        type: "local",
        path: "file.json",
        localPath: "file.json",
      },
    ]);

    expect(result.contentTypes).toEqual({
      ".txt": "text/plain",
      ".json": "application/json",
    });

    expect(result.xml).toContain("<Default Extension=\".txt\" ContentType=\"text/plain\" />");
    expect(result.xml).toContain("<Default Extension=\".json\" ContentType=\"application/json\" />");
    expect(result.xml).toMatchSnapshot();
  });

  it("should lookup content types for unknown extensions", () => {
    const result = getContentTypesForFiles([
      {
        type: "local",
        path: "file.jade",
        localPath: "file.jade",
      },
    ]);

    expect(result.contentTypes).toEqual({
      ".jade": "text/jade",
    });

    expect(result.xml).toContain("<Default Extension=\".jade\" ContentType=\"text/jade\" />");
    expect(result.xml).toMatchSnapshot();
  });

  it("should throw an error for unknown extensions that cannot be resolved", () => {
    expect(() => getContentTypesForFiles([
      {
        type: "local",
        localPath: "file.unknown",
        path: "file.unknown",
      },
    ])).toThrow(
      "could not determine content type for file: file.unknown",
    );
  });
});

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { assert, expect, it } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { collect, type VsixFile } from "../src/files";
import { readProjectManifest } from "../src/manifest";

it("should collect files for a simple extension", async () => {
  const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension");
  const path = await testdir(testdirFiles);

  const { manifest } = await readProjectManifest(path);

  const files = await collect(manifest, {
    cwd: path,
  });

  assert(manifest.displayName === "Simple Extension", "displayName should be 'Simple Extension'");
  assert(files.length > 0, "files should not be empty");

  expect(files).toMatchObject(expect.arrayContaining([
    {
      type: "local",
      path: "extension/package.json",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/package.json",
    },
    {
      type: "local",
      path: "extension/README.md",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/README.md",
    },
    {
      type: "local",
      path: "extension/LICENSE",
      localPath:
        ".vitest-testdirs/vitest-files-should-collect-files-for-a-simple-extension/LICENSE",
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

  const { manifest } = await readProjectManifest(path);

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
      path: "extension/package.json",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/package.json",
    },
    {
      type: "local",
      path: "extension/README.md",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/README.md",
    },
    {
      type: "local",
      path: "extension/LICENSE",
      localPath:
        ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-README-path/LICENSE",
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

  const { manifest } = await readProjectManifest(path);

  const files = await collect(manifest, {
    cwd: path,
    ignoreFile: ".vsixignore",
  });

  assert(manifest.displayName === "Simple Extension", "displayName should be 'Simple Extension'");
  assert(files.length > 0, "files should not be empty");

  expect(files).toMatchObject(expect.arrayContaining([
    {
      type: "local",
      path: "extension/package.json",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/package.json",
    },
    {
      type: "local",
      path: "extension/README.md",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/README.md",
    },
    {
      type: "local",
      path: "extension/LICENSE",
      localPath:
        ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/LICENSE",
    },
    {
      type: "local",
      localPath: ".vitest-testdirs/vitest-files-should-collect-files-for-a-extension-with-a-different-ignore-file/src/extension.ts",
      path: "extension/src/extension.ts",
    },
  ] satisfies VsixFile[]));
});

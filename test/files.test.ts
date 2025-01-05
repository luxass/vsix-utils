import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { promisify } from "node:util";
import { assert, describe, expect, it } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { collect, getContentTypesForFiles, getExtensionDependencies, isInMemoryFile, isLocalFile, type VsixFile } from "../src/files";
import { readProjectManifest } from "../src/manifest";

const execAsync = promisify(exec);

describe("collect files", () => {
  it("collect files for a simple extension", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    const files = await collect(manifest, {
      cwd: dir,
    });

    assert(manifest.displayName === "Simple Extension", `displayName should be 'Simple Extension' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 4, "files should have 4 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),
      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/dist/extension.js"),
        localPath: normalize(join(dir, "dist/extension.js")),
      },
    ] satisfies VsixFile[]));
  });

  it("collect files for a simple extension with a different readme", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension", {
      ignore: ["node_modules"],
      extras: {
        "extra-readme.md": "This is an extra README file",
      },
    });

    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    const files = await collect(manifest, {
      cwd: dir,
      readme: "extra-readme.md",
    });

    const readmeContent = await readFile(join(dir, "extra-readme.md"), "utf8");

    assert(manifest.displayName === "Simple Extension", `displayName should be 'Simple Extension' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 5, "files should have 5 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),
      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/dist/extension.js"),
        localPath: normalize(join(dir, "dist/extension.js")),
      },
      {
        type: "local",
        path: normalize("extension/extra-readme.md"),
        localPath: normalize(join(dir, "extra-readme.md")),
      },
    ] satisfies VsixFile[]));

    expect(readmeContent).toBe("This is an extra README file");
  });

  it("collect files for a simple extension with a different ignore file", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-extension", {
      ignore: ["node_modules"],
      extras: {
        ".vsixignore": ".vscode/**\n.gitignore\n**/tsconfig.json",
      },
    });

    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    const files = await collect(manifest, {
      cwd: dir,
      ignoreFile: ".vsixignore",
    });

    assert(manifest.displayName === "Simple Extension", `displayName should be 'Simple Extension' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 6, "files should have 6 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/.vsixignore"),
        localPath: normalize(join(dir, ".vsixignore")),
      },
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),

      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/src/extension.ts"),
        localPath: normalize(join(dir, "src/extension.ts")),
      },
      {
        type: "local",
        path: normalize("extension/dist/extension.js"),
        localPath: normalize(join(dir, "dist/extension.js")),
      },
    ] satisfies VsixFile[]));
  });

  it("collect files for a no entrypoint extension", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/tsup-problem-matchers", {
      ignore: ["node_modules"],
    });

    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    const files = await collect(manifest, {
      cwd: dir,
    });

    assert(manifest.displayName === "tsup Problem Matchers", `displayName should be 'tsup Problem Matchers' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 4, "files should have 4 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),
      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/media/icon.png"),
        localPath: normalize(join(dir, "media/icon.png")),
      },
    ] satisfies VsixFile[]));
  });

  it("collect files for a bundled extension", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/bundled-extension", {
      ignore: ["node_modules"],
    });

    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    const files = await collect(manifest, {
      cwd: dir,
    });

    assert(manifest.displayName === "Bundled Extension", `displayName should be 'Bundled Extension' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 4, "files should have 4 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),
      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/dist/extension.js"),
        localPath: normalize(join(dir, "dist/extension.js")),
      },
    ] satisfies VsixFile[]));
  });

  it("collect files for a simple extension with dependencies", async () => {
    const testdirFiles = await fromFileSystem("./test/fixtures/extensions/simple-with-dependencies");

    const dir = await testdir(testdirFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("pnpm install --ignore-workspace", {
      cwd: dir,
    });

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "auto",
    });

    expect(packageManager).toBe("pnpm");
    expect(dependencies.length).toBeGreaterThan(0);

    const files = await collect(manifest, {
      cwd: dir,
      dependencies,
    });

    assert(manifest.displayName === "Simple with Dependencies Extension", `displayName should be 'Simple with Dependencies Extension' was ${manifest.displayName}`);
    assert(files.length > 0, "files should not be empty");
    assert(files.length === 6, "files should have 6 items");

    expect(files).toEqual(expect.arrayContaining([
      {
        type: "local",
        path: normalize("extension/package.json"),
        localPath: normalize(join(dir, "package.json")),
      },
      {
        type: "local",
        path: normalize("extension/README.md"),
        localPath: normalize(join(dir, "README.md")),
      },
      {
        type: "local",
        path: normalize("extension/LICENSE"),
        localPath: normalize(join(dir, "LICENSE")),
      },
      {
        type: "local",
        path: normalize("extension/dist/extension.js"),
        localPath: normalize(join(dir, "dist/extension.js")),
      },
      {
        type: "local",
        path: normalize("extension/node_modules/js-yaml"),
        localPath: normalize(join(dir, "node_modules/.pnpm/js-yaml@4.1.0/node_modules/js-yaml")),
      },
      {
        type: "local",
        path: normalize("extension/node_modules/argparse"),
        localPath: normalize(join(dir, "node_modules/.pnpm/argparse@2.0.1/node_modules/argparse")),
      },
    ] satisfies VsixFile[]));
  });
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

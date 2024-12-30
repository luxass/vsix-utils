import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, onTestFinished } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { readVsix, writeVsix } from "../src/zip";

describe("write vsix", () => {
  it("should throw if package path exists and force is false", async () => {
    const testdirFiles = {
      "existing.vsix": "",
      "test.txt": "test content",
    };

    const path = await testdir(testdirFiles);

    await expect(writeVsix({
      packagePath: join(path, "existing.vsix"),
      files: [
        {
          type: "local",
          localPath: join(path, "test.txt"),
          path: "test.txt",
        },
      ],
    })).rejects.toThrow(
      `package already exists at ${join(path, "existing.vsix")}`,
    );
  });

  it("should throw if no files specified", async () => {
    const path = await testdir({
      "test.txt": "test content",
    });

    await expect(writeVsix({
      packagePath: join(path, "test.vsix"),
      files: [],
    })).rejects.toThrow("no files specified to package");
  });

  it("should throw if no package path specified", async () => {
    const path = await testdir({
      "test.txt": "test content",
    });

    await expect(writeVsix({
      packagePath: "",
      files: [
        {
          type: "local",
          localPath: join(path, "test.txt"),
          path: "test.txt",
        },
      ],
    })).rejects.toThrow("no package path specified");
  });

  it("should create vsix with local files", async () => {
    const path = await testdir({
      "test.txt": "test content",
    });

    const result = await writeVsix({
      packagePath: join(path, "pkg.vsix"),
      files: [
        {
          type: "local",
          localPath: join(path, "test.txt"),
          path: "test.txt",
        },
      ],
    });

    expect(result).toBe(true);
    expect(existsSync(join(path, "pkg.vsix"))).toBe(true);

    const content = await readFile(join(path, "test.txt"), "utf-8");
    expect(content).toBe("test content");
  });

  it("should create vsix with in-memory files", async () => {
    const path = await testdir({
      "test.txt": "test content",
    });

    const result = await writeVsix({
      packagePath: join(path, "pkg.vsix"),
      files: [
        {
          type: "in-memory",
          contents: "test content",
          path: "test.txt",
        },
      ],
    });

    expect(result).toBe(true);
    expect(existsSync(join(path, "pkg.vsix"))).toBe(true);

    const content = await readFile(join(path, "test.txt"), "utf-8");
    expect(content).toBe("test content");
  });

  it("should overwrite existing package if `force` is enabled", async () => {
    const path = await testdir({
      "pkg.vsix": "hello world",
      "test.txt": "test content",
    });

    const metadata = await stat(join(path, "pkg.vsix"));

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = await writeVsix({
      packagePath: join(path, "pkg.vsix"),
      files: [
        {
          type: "in-memory",
          contents: "test content",
          path: "test.txt",
        },
      ],
      force: true,
    });

    expect(result).toBe(true);
    expect(existsSync(join(path, "pkg.vsix"))).toBe(true);

    const newMetadata = await stat(join(path, "pkg.vsix"));
    expect(newMetadata.mtimeMs).not.toBe(metadata.mtimeMs);

    const content = await readFile(join(path, "test.txt"), "utf-8");
    expect(content).toBe("test content");
  });

  it("should throw if local file does not exist", async () => {
    const path = await testdir({
      "test.txt": "test content",
    }, {
      cleanup: false,
    });

    onTestFinished(async () => {
      const files = await readdir(path);

      console.error(files);
    });

    await expect(writeVsix({
      packagePath: join(path, "pkg.vsix"),
      files: [
        {
          type: "local",
          localPath: join(path, "non-existent.txt"),
          path: "test.txt",
        },
      ],
    })).rejects.toThrow(/^ENOENT: no such file or directory/m);
  });

  it("should be able to customize epoch", async () => {
    const path = await testdir({
      "empty.txt": "",
    });

    const [result1, result2, result3] = await Promise.all([
      writeVsix({
        packagePath: join(path, "pkg-1.vsix"),
        files: [
          {
            type: "in-memory",
            contents: "test content",
            path: "test.txt",
          },
        ],
        epoch: 1000000000,
      }),
      writeVsix({
        packagePath: join(path, "pkg-2.vsix"),
        files: [
          {
            type: "in-memory",
            contents: "test content",
            path: "test.txt",
          },
        ],
        epoch: 1000000000,
      }),
      writeVsix({
        packagePath: join(path, "pkg-3.vsix"),
        files: [
          {
            type: "in-memory",
            contents: "test content",
            path: "test.txt",
          },
        ],
        epoch: 1000000002,
      }),
    ]);

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);

    const content1 = await readFile(join(path, "pkg-1.vsix"));
    const content2 = await readFile(join(path, "pkg-2.vsix"));
    const content3 = await readFile(join(path, "pkg-3.vsix"));

    expect(content1).toEqual(content2);
    expect(content1).not.toEqual(content3);
  });
});

describe("read vsix", () => {
  it("should read vsix package", async () => {
    const path = await testdir(await fromFileSystem("./test/fixtures/zip", {
      getEncodingForFile: (path) => {
        return path.endsWith(".vsix") ? null : "utf-8";
      },
    }));

    const { files, manifest } = await readVsix({
      packagePath: join(path, "luxass.tsup-problem-matchers-1.0.7.vsix"),
    });

    expect(files).toHaveLength(7);
    expect(manifest.packagemanifest).toBeDefined();
  });

  it("should throw if extension.vsixmanifest is not found", async () => {
    const path = await testdir(await fromFileSystem("./test/fixtures/zip", {
      getEncodingForFile: (path) => {
        return path.endsWith(".vsix") ? null : "utf-8";
      },
    }));

    await expect(readVsix({
      packagePath: join(path, "without-manifest.vsix"),
    })).rejects.toThrow(
      `extension.vsixmanifest file is missing`,
    );
  });
});

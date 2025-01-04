import { exec } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testdir } from "vitest-testdirs";
import { prepublish } from "../src/scripts";
import { createManifest } from "./utils";

vi.mock("node:child_process", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:child_process")>();
  const mod = {
    ...original,
    exec: vi.fn(),
  };

  return {
    ...mod,
    default: mod,
  };
});

describe.each([
  "npm",
  "yarn",
  "pnpm",
] as const)("prepublish: %s", (packageManager) => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should do nothing if manifest has no scripts", async () => {
    const manifest = createManifest();

    await prepublish({
      cwd: "./test",
      packageManager,
      manifest,
      preRelease: false,
    });

    expect(exec).not.toHaveBeenCalled();
  });

  it("should run vscode:prepublish script if present", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      callback!(null, "", "");
      return {} as any;
    });

    const manifest = createManifest({
      scripts: {
        "vscode:prepublish": "echo test",
      },
    });

    const dir = await testdir({
      "package.json": JSON.stringify(manifest),
    });

    await prepublish({
      cwd: dir,
      packageManager,
      manifest,
      preRelease: false,
    });

    expect(exec).toHaveBeenCalledWith(
      `${packageManager} run vscode:prepublish`,
      { cwd: dir },
      expect.any(Function),
    );
  });

  it("should run release script when not prerelease", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      callback!(null, "", "");
      return {} as any;
    });

    const manifest = createManifest({
      scripts: {
        "vscode:prepublish:release": "echo release",
      },
    });

    const dir = await testdir({
      "package.json": JSON.stringify(manifest),
    });

    await prepublish({
      cwd: dir,
      packageManager,
      manifest,
      preRelease: false,
    });

    expect(exec).toHaveBeenCalledWith(
      `${packageManager} run vscode:prepublish:release`,
      { cwd: dir },
      expect.any(Function),
    );
  });

  it("should run prerelease script when prerelease", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      callback!(null, "", "");
      return {} as any;
    });

    const manifest = createManifest({
      scripts: {
        "vscode:prepublish:prerelease": "echo prerelease",
      },
    });

    const dir = await testdir({
      "package.json": JSON.stringify(manifest),
    });

    await prepublish({
      cwd: dir,
      packageManager,
      manifest,
      preRelease: true,
    });

    expect(exec).toHaveBeenCalledWith(
      `${packageManager} run vscode:prepublish:prerelease`,
      { cwd: dir },
      expect.any(Function),
    );
  });

  it("should be able to run multiple scripts", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      callback!(null, "", "");
      return {} as any;
    });

    const manifest = createManifest({
      scripts: {
        "vscode:prepublish": "echo test",
        "vscode:prepublish:release": "echo release",
      },
    });

    const dir = await testdir({
      "package.json": JSON.stringify(manifest),
    });

    await prepublish({
      cwd: dir,
      packageManager,
      manifest,
      preRelease: false,
    });

    expect(exec).toHaveBeenCalledWith(
      `${packageManager} run vscode:prepublish`,
      { cwd: dir },
      expect.any(Function),
    );
  });

  it("should throw if any script fails", async () => {
    vi.mocked(exec).mockImplementation((cmd, opts, callback) => {
      callback!(new Error("failed"), "", "error");
      return {} as any;
    });

    const manifest = createManifest({
      scripts: {
        "vscode:prepublish": "echo fail",
      },
    });

    const dir = await testdir({
      "package.json": JSON.stringify(manifest),
    });

    await expect(prepublish({
      cwd: dir,
      packageManager,
      manifest,
      preRelease: false,
    })).rejects.toThrow("failed to run one or more scripts");
  });
});

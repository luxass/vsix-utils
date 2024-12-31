import { exec } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { getExtensionDependencies } from "../src/files";
import { readProjectManifest } from "../src/manifest";
import { hasPM, transformAbsolutePathToVitestTestdirPath } from "./utils";

const execAsync = promisify(exec);

// timeout should be 20s as npm can take a bit to install
describe.runIf(await hasPM("npm"))("npm", { timeout: 20000 }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  // TODO: currently the package manager detect is traversing up the directory
  //       and therefor will locate the package.json in the root of the project
  //       instead of stopping at the test directory. So this test will fail until
  //       we have a otion to stop the traversing.
  //       PR: https://github.com/antfu-collective/package-manager-detector/pull/39
  it.todo("should throw an error if package is auto and can't be detected", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "auto",
    })).rejects.toThrow("unable to detect package manager");
  });

  it("should default to auto if package manager is not provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("npm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("npm");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("npm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "npm",
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("npm");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/with-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("npm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "npm",
    });

    // prevent issues with running tests locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => transformAbsolutePathToVitestTestdirPath(dep.path));

    expect(packageManager).toEqual("npm");
    expect(dependenciesWithRelative).toMatchSnapshot();
  });
});

describe.runIf(await hasPM("yarn"))("yarn", { timeout: 20000 }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  // TODO: currently the package manager detect is traversing up the directory
  //       and therefor will locate the package.json in the root of the project
  //       instead of stopping at the test directory. So this test will fail until
  //       we have a otion to stop the traversing.
  //       PR: https://github.com/antfu-collective/package-manager-detector/pull/39
  it.todo("should throw an error if package is auto and can't be detected", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "auto",
    })).rejects.toThrow("unable to detect package manager");
  });

  it("should default to auto if package manager is not provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("yarn install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("yarn");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("yarn install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "yarn",
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("yarn");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/with-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("yarn install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "yarn",
    });

    // prevent issues with running tests locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => transformAbsolutePathToVitestTestdirPath(dep.path));

    expect(packageManager).toEqual("yarn");
    expect(dependenciesWithRelative).toMatchSnapshot();
  });
});

describe.runIf(await hasPM("pnpm"))("pnpm", { timeout: 20000 }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  // TODO: currently the package manager detect is traversing up the directory
  //       and therefor will locate the package.json in the root of the project
  //       instead of stopping at the test directory. So this test will fail until
  //       we have a otion to stop the traversing.
  //       PR: https://github.com/antfu-collective/package-manager-detector/pull/39
  it.todo("should throw an error if package is auto and can't be detected", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies");
    const dir = await testdir(fsFiles);

    const { manifest } = await readProjectManifest(dir);

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "auto",
    })).rejects.toThrow("unable to detect package manager");
  });

  it("should default to auto if package manager is not provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("pnpm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("pnpm");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("pnpm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "pnpm",
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("pnpm");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/with-dependencies");
    const dir = await testdir(fsFiles);

    await execAsync("pnpm install", { cwd: dir });

    const { manifest } = await readProjectManifest(dir);

    const { dependencies, packageManager } = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager: "pnpm",
    });

    // prevent issues with running tests locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => transformAbsolutePathToVitestTestdirPath(dep.path));

    expect(packageManager).toEqual("pnpm");
    expect(dependenciesWithRelative).toMatchSnapshot();
  });
});

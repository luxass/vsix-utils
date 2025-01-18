import { exec } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { fromFileSystem, testdir } from "vitest-testdirs";
import { getExtensionDependencies } from "../src/dependencies";
import { getExtensionPackageManager } from "../src/files";
import { readProjectManifest } from "../src/manifest";
import { hasPM, transformAbsolutePathToVitestTestdirPath } from "./utils";

const execAsync = promisify(exec);

const TIMEOUT = 30_000; // 30 seconds

describe("detect package manager", () => {
  it("should detect npm", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const packageManager = await getExtensionPackageManager(dir);

    expect(packageManager).toEqual("npm");
  });

  it("should detect yarn", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const packageManager = await getExtensionPackageManager(dir);

    expect(packageManager).toEqual("yarn");
  });

  it("should detect pnpm", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const packageManager = await getExtensionPackageManager(dir);

    expect(packageManager).toEqual("pnpm");
  });

  // TODO: currently the package manager detect is traversing up the directory
  //       and therefor will locate the package.json in the root of the project
  //       instead of stopping at the test directory. So this test will fail until
  //       we have a otion to stop the traversing.
  //       PR: https://github.com/antfu-collective/package-manager-detector/pull/39
  it.todo("should throw an error if no package manager is detected", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/none", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    await expect(getExtensionPackageManager(dir)).rejects.toThrow("unable to detect package manager");
  });
});

describe.runIf(await hasPM("npm"))("npm", { timeout: TIMEOUT }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  it("should default to auto if package manager is not provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("npm install", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    expect(dependencies).toEqual([]);
    expect(packageManager).toEqual("npm");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("npm install", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    expect(dependencies).toEqual([]);
    expect(packageManager).toEqual("npm");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/npm/with-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("npm install", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    // prevent issues with running tests in ci and locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => ({
      ...dep,
      path: transformAbsolutePathToVitestTestdirPath(dep.path),
    }));

    expect(dependenciesWithRelative).toMatchSnapshot();
    expect(packageManager).toEqual("npm");
  });
});

describe.runIf(await hasPM("yarn"))("yarn", { timeout: TIMEOUT }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("yarn install", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("yarn");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/yarn/with-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("yarn install", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    // prevent issues with running tests in ci and locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => ({
      ...dep,
      path: transformAbsolutePathToVitestTestdirPath(dep.path),
    }));

    expect(dependenciesWithRelative).toMatchSnapshot();
    expect(packageManager).toEqual("yarn");
  });
});

describe.runIf(await hasPM("pnpm"))("pnpm", { timeout: TIMEOUT }, () => {
  it("should throw an error if unsupported package manager is provided", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await expect(getExtensionDependencies(manifest, {
      cwd: dir,
      // @ts-expect-error just testing for unsupported package manager
      packageManager: "custom",
    })).rejects.toThrow("unsupported package manager: custom");
  });

  it("should handle no dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/no-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("pnpm install --ignore-workspace", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    expect(dependencies).toEqual([]);

    expect(packageManager).toEqual("pnpm");
  });

  it("should handle dependencies correctly", async () => {
    const fsFiles = await fromFileSystem("./test/fixtures/package-manager/pnpm/with-dependencies", {
      ignore: ["node_modules"],
    });
    const dir = await testdir(fsFiles);

    const projectManifest = await readProjectManifest(dir);

    if (projectManifest == null) {
      expect.fail("project manifest is null");
    }

    const { manifest } = projectManifest;

    await execAsync("pnpm install --ignore-workspace", { cwd: dir });

    const packageManager = await getExtensionPackageManager(dir);

    if (packageManager == null) {
      expect.fail("package manager is null");
    }

    const dependencies = await getExtensionDependencies(manifest, {
      cwd: dir,
      packageManager,
    });

    // prevent issues with running tests in ci and locally, as the path will be different
    const dependenciesWithRelative = dependencies.map((dep) => ({
      ...dep,
      path: transformAbsolutePathToVitestTestdirPath(dep.path),
    }));

    expect(dependenciesWithRelative).toMatchSnapshot();
    expect(packageManager).toEqual("pnpm");
  });
});

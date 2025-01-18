import type { Manifest, PackageManager } from "./types";
import { exec } from "node:child_process";
import path, { isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ExtensionDependenciesOptions {
  /**
   * The package manager to use.
   */
  packageManager: PackageManager;

  /**
   * The current working directory
   * @default process.cwd()
   */
  cwd: string;
}

export interface ExtensionDependency {
  /**
   * The name of the dependency.
   */
  name: string;

  /**
   * The version of the dependency.
   */
  version?: string;

  /**
   * The path to the dependency.
   */
  path: string;
}

interface PnpmDependency {
  from: string;
  version: string;
  resolved: string;
  path: string;
  dependencies: Record<string, PnpmDependency>;
}

interface YarnTreeNode {
  name: string;
  children: YarnTreeNode[];
}

interface YarnDependency {
  name: string;
  path: string;
  version: string;
  children: YarnDependency[];
}

/**
 * Retrieves all production dependencies for an extension based on the package manager being used.
 *
 * @param {Manifest} manifest - The extension's manifest object containing dependency information
 * @param {ExtensionDependenciesOptions} options - Configuration options for retrieving dependencies
 *
 * @returns {Promise<ExtensionDependenciesResult} Promise resolving to an object containing:
 * - dependencies: Array of extension dependencies with name, version and path
 * - packageManager: The package manager that was used
 *
 * @throws Error if:
 * - Package manager cannot be detected when using 'auto'
 * - Unsupported package manager is detected/specified (e.g. deno, bun)
 * - Unable to parse dependency information from package manager output
 *
 * @remarks
 * Supports npm, yarn, and pnpm package managers.
 * When using npm, parses output of `npm list`
 * When using yarn, parses output of `yarn list`
 * When using pnpm, parses output of `pnpm list`
 */
export async function getExtensionDependencies(manifest: Manifest, options: ExtensionDependenciesOptions): Promise<ExtensionDependency[]> {
  const {
    packageManager,
    cwd = process.cwd(),
  } = options;

  const dependencies = new Set<ExtensionDependency>();

  if (packageManager === "npm") {
    const { stdout } = await execAsync("npm list --production --parseable --depth=99999 --loglevel=error", { cwd });
    const lines = stdout.split(/[\r\n]/).filter((path) => isAbsolute(path));

    for (const line of lines) {
      if (line === resolve(cwd)) {
        continue;
      }

      const dependency = line.split(`${path.sep}node_modules${path.sep}`)[1];

      if (dependency == null) {
        throw new Error(`could not parse dependency: ${line}`);
      }

      dependencies.add({
        name: dependency.replace(/\\/g, "/"),
        version: manifest.dependencies != null ? manifest.dependencies[dependency.replace(/\\/g, "/")] : undefined,
        path: line,
      });
    }
  } else if (packageManager === "yarn") {
    const { stdout } = await execAsync("yarn list --prod --json", { cwd });

    const match = /^\{"type":"tree".*$/m.exec(stdout);

    if (!match || match.length !== 1) {
      throw new Error("Could not parse result of `yarn list --json`");
    }

    const trees = JSON.parse(match[0]).data.trees as YarnTreeNode[];

    if (!Array.isArray(trees) || trees.length === 0) {
      return [];
    }

    const prune = true; // TODO: using packaged dependencies

    function asYarnDependency(prefix: string, tree: YarnTreeNode, prune: boolean): YarnDependency | null {
      if (prune && /@[\^~]/.test(tree.name)) {
        return null;
      }

      let name: string;
      let version: string = "";
      try {
        const tmp = tree.name.split("@");

        if (tmp[0] === "") {
          tmp.shift();
          tmp[0] = `@${tmp[0]}`;
        }

        name = tmp[0]!;
        version = tmp[1] || "";
      } catch {
        name = tree.name.replace(/^([^@+])@.*$/, "$1");
      }

      const dependencyPath = path.join(prefix, name);
      const children: YarnDependency[] = [];

      for (const child of tree.children || []) {
        const dep = asYarnDependency(path.join(prefix, name, "node_modules"), child, prune);

        if (dep) {
          children.push(dep);
        }
      }

      return { name, path: dependencyPath, children, version };
    }

    const result = trees.map((tree) => asYarnDependency(join(cwd, "node_modules"), tree, prune)).filter((dep) => dep != null);

    const internalDeps = new Set<string>();

    const flatten = (dep: YarnDependency) => {
      if (internalDeps.has(dep.path)) {
        return;
      }

      dependencies.add({
        name: dep.name,
        version: dep.version,
        path: dep.path,
      });
      internalDeps.add(dep.path);

      if (dep.children) {
        for (const child of dep.children) {
          flatten(child);
        }
      }
    };

    for (const dep of result) {
      flatten(dep);
    }
  } else if (packageManager === "pnpm") {
    // use --ignore-workspace to avoid always including the workspace packages
    const { stdout } = await execAsync("pnpm list --production --json --depth=99999 --loglevel=error --ignore-workspace", { cwd });
    let entryList = [];
    try {
      entryList = JSON.parse(stdout);
    } catch {
      return [];
    }

    if (!Array.isArray(entryList) || entryList.length === 0) {
      return [];
    }

    const entry = entryList[0] as {
      dependencies?: Record<string, PnpmDependency>;
    };

    if (entry == null || typeof entry !== "object" || entry.dependencies == null || typeof entry.dependencies !== "object") {
      return [];
    }

    const internalDeps = new Set<string>();

    const flatten = (dep: PnpmDependency) => {
      if (internalDeps.has(dep.path)) {
        return;
      }

      dependencies.add({
        name: dep.from,
        version: dep.version,
        path: dep.path,
      });
      internalDeps.add(dep.path);

      if (dep.dependencies) {
        for (const child of Object.values(dep.dependencies)) {
          flatten(child);
        }
      }
    };

    for (const value of Object.values(entry.dependencies)) {
      flatten(value);
    }
  } else {
    throw new Error(`unsupported package manager: ${packageManager}`);
  }

  return Array.from(dependencies);
}

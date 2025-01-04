import type { Manifest, PackageManager } from "./types";
import { exec } from "node:child_process";

export interface PrepublishOptions {
  /**
   * The current working directory.
   */
  cwd: string;

  /**
   * The package manager to use.
   */
  packageManager: Exclude<PackageManager, "auto">;

  /**
   * The manifest of the extension.
   */
  manifest: Manifest;

  /**
   * Whether the extension is a pre-release.
   */
  preRelease: boolean;
}

/**
 * Executes the publish related scripts in a VS Code extension package.json.
 *
 * The function will run the following scripts in order if they exist:
 * - `vscode:prepublish`
 * - `vscode:prepublish:release` (only if not a pre-release)
 * - `vscode:prepublish:prerelease` (only if pre-release)
 *
 * @param {PrepublishOptions} options - The options for the prepublish command
 * @param {string} options.cwd - The current working directory
 * @param {Exclude<PackageManager, "auto">} options.packageManager - The package manager to use (npm, yarn, pnpm)
 * @param {Manifest} options.manifest - The package.json manifest object
 * @param {boolean} options.preRelease - Whether this is a pre-release build
 *
 * @returns {Promise<void>} A promise that resolves when all scripts have been executed
 */
export async function prepublish(options: PrepublishOptions): Promise<void> {
  const { cwd, packageManager, manifest, preRelease } = options;

  if (!manifest.scripts) {
    return;
  }

  const scripts: string[] = [];
  if ("vscode:prepublish" in manifest.scripts) {
    scripts.push("vscode:prepublish");
  }

  if ("vscode:prepublish:release" in manifest.scripts && !preRelease) {
    scripts.push("vscode:prepublish:release");
  }

  if ("vscode:prepublish:prerelease" in manifest.scripts && preRelease) {
    scripts.push("vscode:prepublish:prerelease");
  }

  if (scripts.length === 0) {
    return;
  }

  const results = await Promise.all(
    scripts.map((script) => runScript({ cwd, packageManager, script })),
  );

  if (results.some((result) => !result)) {
    throw new Error("failed to run one or more scripts");
  }
}

interface RunScriptOptions {
  /**
   * The current working directory.
   */
  cwd: string;

  /**
   * The package manager to use.
   */
  packageManager: Exclude<PackageManager, "auto">;

  /**
   * The script to run.
   */
  script: string;
}

async function runScript(options: RunScriptOptions): Promise<boolean> {
  const { cwd, packageManager, script } = options;
  try {
    const { stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      exec(`${packageManager} run ${script}`, { cwd }, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    if (stderr.trim() !== "") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

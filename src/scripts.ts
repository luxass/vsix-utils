import type { Manifest, PackageManager } from "./types";
import { spawn } from "node:child_process";
import { promisify } from "node:util";

const spawnAsync = promisify(spawn);

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

  for (const script of scripts) {
    await runScript({ cwd, packageManager, script });
  }
}

export interface RunScriptOptions {
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

export async function runScript(options: RunScriptOptions): Promise<void> {
  const { cwd, packageManager, script } = options;

  await spawnAsync(packageManager, ["run", script], {
    cwd,
    shell: true,
    stdio: "inherit",
  });
}

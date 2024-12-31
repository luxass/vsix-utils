import type { Manifest } from "../src/types";
import { exec } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import { assert } from "vitest";

export function createManifest(extra: Partial<Manifest> = {}): Manifest {
  return {
    name: "manifest-test",
    publisher: "luxass",
    version: "0.0.1",
    description: "A test extension for Visual Studio Code",
    engines: { vscode: "*" },
    ...extra,
  };
}

const execAsync = promisify(exec);

export async function hasPM(pm: "npm" | "pnpm" | "yarn"): Promise<boolean> {
  if (pm !== "npm" && pm !== "pnpm" && pm !== "yarn") {
    throw new Error("invalid package manager");
  }

  try {
    await execAsync(`${pm} --version`);
    return true;
  } catch {
    console.error("could not find package manager:", pm);
    console.error("please install it to run this test");

    if (process.env.CI) {
      console.error("because this is a CI environment, the test will fail");
      assert.fail(`missing package manager: ${pm}`);
    }

    return false;
  }
}

export function transformAbsolutePathToVitestTestdirPath(path?: string): string {
  if (path == null) {
    throw new Error("path is required");
  }

  return path.replace(`${process.cwd()}/`, "").replace(/\\/g, "/");
}

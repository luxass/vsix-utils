import type { Manifest } from "../src/types";

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

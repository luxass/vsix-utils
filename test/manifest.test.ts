import { describe, expect, it } from "vitest";
import { testdir } from "vitest-testdirs";
import { readProjectManifest } from "../src/manifest";

describe("read project manifest", () => {
  it("should read and parse the project manifest", async () => {
    const path = await testdir({
      "package.json": JSON.stringify({ name: "test-project", version: "1.0.0" }),
    });

    const result = await readProjectManifest(path);

    expect(result).toEqual({
      fileName: `${path}/package.json`,
      manifest: { name: "test-project", version: "1.0.0" },
    });
  });

  it("should return null if the manifest file does not exist", async () => {
    const path = await testdir({
      "README.md": "This is not a json file!",
    });

    const result = await readProjectManifest(path);

    expect(result).toBeNull();
  });

  it("should return null if the manifest file is not a valid JSON", async () => {
    const path = await testdir({
      "package.json": "invalid JSON",
    });

    const result = await readProjectManifest(path);

    expect(result).toBeNull();
  });
});

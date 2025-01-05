import { describe, expect, it } from "vitest";
import { validateProjectManifest, validateVSCodeTypesCompatability } from "../src/validation";
import { createManifest } from "./utils";

describe("validate vscode types compatibility", () => {
  it.each([
    ["*", "1.30.0"],
    ["*", "^1.30.0"],
    ["*", "~1.30.0"],
    ["1.30.0", "1.30.0"],
    ["1.30.x", "1.29.0"],
    ["x.30.0", "1.29.0"],
    // patches is allowed to be higher, as it comes from DefinitelyTyped
    ["1.30.x", "1.30.1"],
    ["1.30.0", "1.30.1"],
    ["1.45.0", "1.45.3"],
  ])(
    "should not throw error when engines %s is higher than types %s",
    (engineVersion, typesVersion) => {
      expect(() =>
        validateVSCodeTypesCompatability(engineVersion, typesVersion),
      ).not.toThrowError();
    },
  );

  it.each([
    [
      "1.30.0",
      "1.40.0",
      "@types/vscode version 1.40.0 is higher than the specified engine version 1.30.0",
    ],
    [
      "1.30.0",
      "^1.40.0",
      "@types/vscode version ^1.40.0 is higher than the specified engine version 1.30.0",
    ],
    [
      "1.30.0",
      "~1.40.0",
      "@types/vscode version ~1.40.0 is higher than the specified engine version 1.30.0",
    ],
    [
      "1.30.0",
      "1.40.0",
      "@types/vscode version 1.40.0 is higher than the specified engine version 1.30.0",
    ],
    [
      "^1.30.0",
      "1.40.0",
      "@types/vscode version 1.40.0 is higher than the specified engine version ^1.30.0",
    ],
    [
      "~1.30.0",
      "1.40.0",
      "@types/vscode version 1.40.0 is higher than the specified engine version ~1.30.0",
    ],
    [
      "1.x.x",
      "1.30.0",
      "@types/vscode version 1.30.0 is higher than the specified engine version 1.x.x",
    ],
    [
      "1.x.0",
      "1.30.0",
      "@types/vscode version 1.30.0 is higher than the specified engine version 1.x.0",
    ],
    [
      "1.5.0",
      "1.30.0",
      "@types/vscode version 1.30.0 is higher than the specified engine version 1.5.0",
    ],
    [
      "1.5",
      "1.30.0",
      "@types/vscode version 1.30.0 is higher than the specified engine version 1.5",
    ],
    ["1.5", "1.30", "@types/vscode version 1.30 is higher than the specified engine version 1.5"],
    ["1.5.0", "*", "invalid engine or types version"],

    // not valid versions
    ["latest", "1.30.0", "invalid engine version 'latest'"],
    ["1.30.0", "latest", "invalid types version 'latest'"],
    ["not-a-version", "1.30.0", "invalid engine version 'not-a-version'"],
    ["a.b.c", "1.0.0", "invalid engine version 'a.b.c'"],
    ["1.0.0", "a.b.c", "invalid types version 'a.b.c'"],
    ["1", "1.0.0", "invalid engine or types version"],
  ])(
    "should throw error when engines %s is lower than types %s",
    (engineVersion, typesVersion, error) => {
      expect(() => validateVSCodeTypesCompatability(engineVersion, typesVersion)).toThrowError(
        error,
      );
    },
  );
});

describe("validate manifests", () => {
  describe("handle missing fields", () => {
    it("should catch all missing fields", async () => {
      const result = await validateProjectManifest({});

      expect(result).toMatchObject(
        expect.arrayContaining([
          {
            field: "name",
            message: "The `name` field is required.",
            type: "MISSING_FIELD",
          },
          {
            field: "version",
            message: "The `version` field is required.",
            type: "MISSING_FIELD",
          },
          {
            field: "publisher",
            message: "The `publisher` field is required.",
            type: "MISSING_FIELD",
          },
          {
            field: "engines",
            message: "The `engines` field is required.",
            type: "MISSING_FIELD",
          },
          {
            field: "engines.vscode",
            message: "The `engines.vscode` field is required.",
            type: "MISSING_FIELD",
          },
        ]),
      );
    });

    it("should catch missing fields in the engines object", async () => {
      const result = await validateProjectManifest({
        name: "test-project",
        version: "1.0.0",
        publisher: "test",
        engines: {},
      });

      expect(result).toMatchObject(
        expect.arrayContaining([
          {
            field: "engines.vscode",
            message: "The `engines.vscode` field is required.",
            type: "MISSING_FIELD",
          },
        ]),
      );
    });

    it("should return none if all required fields are present", async () => {
      const result = await validateProjectManifest(createManifest());

      expect(result).toEqual(null);
    });

    describe("activation events", () => {
      it("ignore if no activation events", async () => {
        const result = await validateProjectManifest(createManifest());

        expect(result).toEqual(null);
      });

      it("should require a browser or main property when activation events are present", async () => {
        const result = await validateProjectManifest(
          createManifest({
            activationEvents: ["*"],
          }),
        );

        expect(result).toMatchObject([
          {
            field: "main",
            message:
              "The use of `activationEvents` field requires either `browser` or `main` to be set.",
            type: "MISSING_FIELD",
          },
          {
            field: "browser",
            message: "The use of `activationEvents` field requires either `browser` or `main` to be set.",
            type: "MISSING_FIELD",
          },
        ]);
      });

      it("require activation events when main is present", async () => {
        const result = await validateProjectManifest(
          createManifest({
            main: "out/main.js",
          }),
        );

        expect(result).toMatchObject([
          {
            field: "activationEvents",
            message:
              "Manifest needs the 'activationEvents' property, given it has a 'main' property.",
            type: "MISSING_FIELD",
          },
        ]);
      });

      it("require activation events when browser is present", async () => {
        const result = await validateProjectManifest(
          createManifest({
            browser: "out/main.js",
          }),
        );

        expect(result).toMatchObject([
          {
            field: "activationEvents",
            message:
              "Manifest needs the 'activationEvents' property, given it has a 'browser' property.",
            type: "MISSING_FIELD",
          },
        ]);
      });
    });
  });

  describe("handle invalid values", () => {
    describe("handle engine versions", () => {
      it("disallow use of latest", async () => {
        const result = await validateProjectManifest(
          createManifest({
            engines: { vscode: "latest" },
          }),
        );

        expect(result).toMatchObject([
          {
            field: "engines.vscode",
            message:
              "The `engines.vscode` field must be a valid semver version range, or 'x' for any version.",
            type: "INVALID_VALUE",
          },
        ]);
      });

      it("disallow use of invalid semver versions", async () => {
        const result = await validateProjectManifest(
          createManifest({
            engines: { vscode: "1.0" },
          }),
        );

        expect(result).toMatchObject([
          {
            field: "engines.vscode",
            message:
              "The `engines.vscode` field must be a valid semver version range, or 'x' for any version.",
            type: "INVALID_VALUE",
          },
        ]);
      });

      it("should allow `*` as a valid version", async () => {
        const result = await validateProjectManifest(
          createManifest({
            engines: { vscode: "*" },
          }),
        );

        expect(result).toEqual(null);
      });
    });

    it("handle valid name", async () => {
      const result = await validateProjectManifest(
        createManifest({
          name: "test-project",
        }),
      );

      expect(result).toEqual(null);
    });

    it("handle invalid name", async () => {
      const result = await validateProjectManifest(
        createManifest({
          name: "test project",
        }),
      );

      expect(result).toMatchObject([
        {
          field: "name",
          message: "The `name` field should be an identifier and not its human-friendly name.",
          type: "INVALID_VALUE",
        },
      ]);
    });

    it("handle valid version", async () => {
      const result = await validateProjectManifest(
        createManifest({
          version: "1.0.0",
        }),
      );

      expect(result).toEqual(null);
    });

    it("handle invalid version", async () => {
      const result = await validateProjectManifest(
        createManifest({
          version: "1.0",
        }),
      );

      expect(result).toMatchObject([
        {
          field: "version",
          message: "The `version` field must be a valid semver version.",
          type: "INVALID_VALUE",
        },
      ]);
    });

    it("handle valid publisher name", async () => {
      const result = await validateProjectManifest(
        createManifest({
          publisher: "test",
        }),
      );

      expect(result).toEqual(null);
    });

    it("handle invalid publisher name", async () => {
      const result = await validateProjectManifest(
        createManifest({
          publisher: "test project",
        }),
      );

      expect(result).toMatchObject([
        {
          field: "publisher",
          message: "The `publisher` field should be an identifier and not its human-friendly name.",
          type: "INVALID_VALUE",
        },
      ]);
    });
  });

  describe("handle pricing", () => {
    it("should not apply pricing rules when pricing isn't defined", async () => {
      const result = await validateProjectManifest(createManifest());

      expect(result).toEqual(null);
    });

    it("should catch invalid pricing", async () => {
      const result = await validateProjectManifest(
        createManifest({
          // @ts-expect-error invalid pricing is used for testing
          pricing: "Paid",
        }),
      );

      expect(result).toMatchObject([
        {
          type: "INVALID_PRICING",
          message: "The `pricing` field must be either 'Free' or 'Paid'.",
          value: "Paid",
        },
      ]);
    });

    it("should return none if the pricing is valid", async () => {
      const result = await validateProjectManifest(
        createManifest({
          pricing: "Free",
        }),
      );

      expect(result).toEqual(null);
    });
  });

  describe("handle engine and types compatibility", () => {
    it("should ignore if types is not defined", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "1.30.0" },
        }),
      );

      expect(result).toEqual(null);
    });

    it("should ignore patch versions", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "1.30.0" },
          devDependencies: { "@types/vscode": "1.30.1" },
        }),
      );

      expect(result).toEqual(null);
    });

    it("should allow if engine is `*`", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "*" },
          devDependencies: { "@types/vscode": "1.0.0" },
        }),
      );

      expect(result).toEqual(null);
    });

    it("should catch when types is higher than engine", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "1.30.0" },
          devDependencies: { "@types/vscode": "1.40.0" },
        }),
      );

      expect(result).toMatchObject([
        {
          type: "VSCODE_TYPES_INCOMPATIBILITY",
          message:
            "@types/vscode version is either higher than the specified engine version or invalid",
        },
      ]);
    });

    it("should catch if engine is not valid", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "1.30.0" },
          devDependencies: { "@types/vscode": "latest" },
        }),
      );

      expect(result).toMatchObject([
        {
          type: "VSCODE_TYPES_INCOMPATIBILITY",
          message:
            "@types/vscode version is either higher than the specified engine version or invalid",
        },
      ]);
    });

    it("should catch if types is not valid", async () => {
      const result = await validateProjectManifest(
        createManifest({
          engines: { vscode: "latest" },
          devDependencies: { "@types/vscode": "1.30.0" },
        }),
      );

      expect(result).toMatchObject([
        {
          type: "INVALID_VALUE",
          field: "engines.vscode",
          message:
            "The `engines.vscode` field must be a valid semver version range, or 'x' for any version.",
        },
        {
          type: "VSCODE_TYPES_INCOMPATIBILITY",
          message:
            "@types/vscode version is either higher than the specified engine version or invalid",
        },
      ]);
    });
  });

  describe("handle invalid icons", () => {
    it("should not apply icon rules when icon isn't defined", async () => {
      const result = await validateProjectManifest(createManifest());

      expect(result).toEqual(null);
    });

    it("should skip non svg icons", async () => {
      const result = await validateProjectManifest(
        createManifest({
          icon: "icon.png",
        }),
      );

      expect(result).toEqual(null);
    });

    it("disallow svg icons", async () => {
      const result = await validateProjectManifest(
        createManifest({
          icon: "icon.svg",
        }),
      );

      expect(result).toMatchObject([
        {
          type: "INVALID_ICON",
          field: "icon",
          message: "SVG icons are not supported. Use PNG icons instead.",
        },
      ]);
    });
  });

  describe("handle badges", () => {
    it("should not apply badge rules when badges aren't defined", async () => {
      const result = await validateProjectManifest(createManifest());

      expect(result).toEqual(null);
    });

    it("should catch invalid badge urls", async () => {
      const result = await validateProjectManifest(
        createManifest({
          badges: [
            {
              url: "invalid-url",
              href: "https://example.com",
              description: "example-badge",
            },
          ],
        }),
      );

      expect(result).toMatchObject([
        {
          field: "badges",
          message: "The badge URL 'invalid-url' must be a valid URL.",
          type: "INVALID_BADGE_URL",
        },
        {
          field: "badges",
          message: "Badge URL must use the 'https' protocol",
          type: "INVALID_BADGE_URL",
        },
      ]);
    });

    it("should disallow svg icons", async () => {
      const result = await validateProjectManifest(
        createManifest({
          badges: [
            {
              url: "https://img.shields.io/badge.svg",
              href: "https://img.shields.io",
              description: "example-badge",
            },
          ],
        }),
      );

      expect(result).toMatchObject([
        {
          field: "badges",
          message: "SVG badges are not supported. Use PNG badges instead",
          type: "INVALID_BADGE_URL",
        },
      ]);
    });

    it("should disallow badges from non https sources", async () => {
      const result = await validateProjectManifest(
        createManifest({
          badges: [
            {
              url: "http://img.shields.io/badge.png",
              href: "https://img.shields.io",
              description: "example-badge",
            },
          ],
        }),
      );

      expect(result).toMatchObject([
        {
          field: "badges",
          message: "Badge URL must use the 'https' protocol",
          type: "INVALID_BADGE_URL",
        },
      ]);
    });
  });

  it("disallow `vscode` under `dependencies`", async () => {
    const result = await validateProjectManifest(
      createManifest({
        dependencies: { vscode: "1.0.0" },
      }),
    );

    expect(result).toMatchObject([
      {
        type: "DEPENDS_ON_VSCODE_IN_DEPENDENCIES",
        field: "dependencies.vscode",
        message: `You should not depend on 'vscode' in your 'dependencies'. Did you mean to add it to 'devDependencies'?`,
      },
    ]);
  });

  describe("handle extension kinds", () => {
    it("should return none if the extension kind is valid", async () => {
      const result = await validateProjectManifest(
        createManifest({
          extensionKind: ["ui"],
        }),
      );

      expect(result).toEqual(null);
    });

    it("should catch invalid extension kinds", async () => {
      const result = await validateProjectManifest(
        createManifest({
          // @ts-expect-error invalid extension is used for testing
          extensionKind: ["browser"],
        }),
      );

      expect(result).toMatchObject([
        {
          type: "INVALID_EXTENSION_KIND",
          field: "extensionKind",
          message: "Invalid extension kind 'browser'. Expected one of: ui, workspace",
        },
      ]);
    });
  });

  describe("handle sponsor urls", () => {
    it("should not apply sponsor rules when sponsor isn't defined", async () => {
      const result = await validateProjectManifest(
        createManifest({
          sponsor: undefined,
        }),
      );

      expect(result).toEqual(null);
    });

    it("handle invalid sponsor urls", async () => {
      const result = await validateProjectManifest(
        createManifest({
          sponsor: {
            url: "invalid-url",
          },
        }),
      );

      expect(result).toMatchObject([
        {
          field: "sponsor.url",
          message: "The `sponsor.url` field must be a valid URL.",
          type: "INVALID_SPONSOR_URL",
        },
      ]);
    });

    it("should return none if the sponsor url is valid", async () => {
      const result = await validateProjectManifest(
        createManifest({
          sponsor: {
            url: "https://example.com",
          },
        }),
      );

      expect(result).toEqual(null);
    });

    it("should only allow sponsor urls from http or https sources", async () => {
      const result = await validateProjectManifest(
        createManifest({
          sponsor: {
            url: "ftp://example.com",
          },
        }),
      );

      expect(result).toMatchObject([
        {
          field: "sponsor.url",
          message: "The protocol 'ftp' is not allowed. Use one of: http, https",
          type: "INVALID_SPONSOR_URL",
        },
      ]);
    });
  });
});

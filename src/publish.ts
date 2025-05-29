/**
 * @module publish
 *
 * This module contains utility functions for publishing vsix files.
 */

import type { Manifest } from "./types";
import type { VSCE_TARGETS } from "./vsce-constants";

export interface PublishOptions {
  personalAccessToken?: string;

  targets?: typeof VSCE_TARGETS[];

  packagePaths?: string[];

  /**
   * Additional headers to apply to the request
   */
  additonalHeaders?: Record<string, string>;

  /**
   * Which registry to publish extensions to
   * @default "vsmarketplace"
   *
   * NOTE:
   * You can pass a object with registryUrl, if you are using a custom registry.
   */
  registry?: "vsmarketplace" | "openvsx" | { registryUrl: string };
}

export async function publish(options: PublishOptions): Promise<any> {
  const { registry = "vsmarketplace", additonalHeaders, packagePaths, targets, personalAccessToken } = options;

  const registryUrl = (typeof registry === "object" && "registryUrl" in registry) ? registry.registryUrl : registry === "openvsx" ? "https://open-vsx.org" : "https://marketplace.visualstudio.com";

  const publishRequests = [];
  // support multiple targets combined with multiple package paths
  // support multiple package paths without targets (auto detect target)
}

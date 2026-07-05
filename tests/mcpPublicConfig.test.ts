import { describe, expect, test } from "vitest";

import { toPublicConfig } from "../src/mcp/publicConfig.js";
import type { RouterConfig } from "../src/config/schema.js";

describe("MCP public config", () => {
  test("returns only schema-declared capability fields", () => {
    const config: RouterConfig = {
      activeRouteId: "text-route",
      defaultRoutes: {
        text: "text-route",
        image: "image-route"
      },
      routes: [
        {
          id: "text-route",
          name: "KMKAPI",
          provider: "openai-compatible",
          capabilities: ["text"],
          baseUrl: "https://www.kamenking.top",
          model: "gpt-5.5",
          secretSource: "cc-switch",
          secretEnvVar: "",
          ccswitchProviderId: "kmkapi",
          outputDir: "outputs/images",
          allowConversationContext: true
        }
      ],
      activeProfileId: "legacy",
      profiles: [
        {
          id: "legacy",
          name: "Legacy",
          provider: "mock",
          baseUrl: "",
          model: "mock-image",
          secretEnvVar: "SHOULD_NOT_BE_USED",
          outputDir: "outputs/images",
          allowConversationContext: false
        }
      ]
    };

    const publicConfig = toPublicConfig(config);

    expect(Object.keys(publicConfig).sort()).toEqual([
      "activeRouteId",
      "defaultRoutes",
      "routes"
    ]);
    expect(JSON.stringify(publicConfig)).not.toContain("profiles");
    expect(JSON.stringify(publicConfig)).not.toContain("activeProfileId");
    expect(JSON.stringify(publicConfig)).not.toContain("SHOULD_NOT_BE_USED");
  });
});

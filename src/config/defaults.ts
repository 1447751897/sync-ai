import { join } from "node:path";

import type { RouterConfig } from "./schema.js";

export function defaultOutputDir(): string {
  return join(process.cwd(), "outputs", "images");
}

export function defaultConfig(): RouterConfig {
  const outputDir = defaultOutputDir();
  return {
    activeRouteId: "mock-local",
    defaultRoutes: {
      image: "mock-local"
    },
    routes: [
      {
        id: "mock-local",
        name: "本地模拟",
        provider: "mock",
        capabilities: ["image"],
        baseUrl: "",
        model: "mock-image",
        secretSource: "env",
        secretEnvVar: "",
        ccswitchProviderId: "",
        outputDir,
        allowConversationContext: false
      }
    ],
    activeProfileId: "mock-local",
    profiles: [
      {
        id: "mock-local",
        name: "本地模拟",
        provider: "mock",
        baseUrl: "",
        model: "mock-image",
        secretEnvVar: "",
        outputDir,
        allowConversationContext: false
      }
    ]
  };
}

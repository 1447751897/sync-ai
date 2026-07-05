import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { ConfigStore, defaultConfigPath } from "../src/config/configStore.js";

describe("ConfigStore", () => {
  test("uses SyncAI as the default local app data folder", () => {
    expect(defaultConfigPath()).toContain("SyncAI");
    expect(defaultConfigPath()).not.toContain("CodexImageRouter");
  });

  test("creates a safe default config when no config file exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-config-"));
    const store = new ConfigStore(join(dir, "config.json"));

    const config = await store.load();

    expect(config.activeRouteId).toBe("mock-local");
    expect(config.defaultRoutes.image).toBe("mock-local");
    expect(config.routes).toHaveLength(1);
    expect(config.routes[0]).toMatchObject({
      id: "mock-local",
      name: "本地模拟",
      provider: "mock",
      capabilities: ["image"],
      model: "mock-image",
      secretSource: "env",
      secretEnvVar: "",
      allowConversationContext: false
    });
    expect(config.routes[0].outputDir).toContain("outputs");
  });

  test("saves config atomically and reloads the same active route", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-config-"));
    const path = join(dir, "config.json");
    const store = new ConfigStore(path);
    const config = await store.load();

    config.activeRouteId = "kmkapi";
    config.defaultRoutes.image = "kmkapi";
    config.routes.push({
      id: "kmkapi",
      name: "KMKAPI Image",
      provider: "openai-compatible",
      capabilities: ["image"],
      baseUrl: "https://www.kamenking.top/v1",
      model: "test-image-model",
      secretSource: "env",
      secretEnvVar: "KMKAPI_IMAGE_API_KEY",
      ccswitchProviderId: "",
      outputDir: join(dir, "images"),
      allowConversationContext: false
    });

    await store.save(config);

    await expect(readFile(path, "utf8")).resolves.toContain('"activeRouteId": "kmkapi"');
    await expect(store.load()).resolves.toMatchObject({
      activeRouteId: "kmkapi",
      routes: expect.arrayContaining([
        expect.objectContaining({
          id: "kmkapi",
          secretEnvVar: "KMKAPI_IMAGE_API_KEY"
        })
      ])
    });
  });

  test("migrates from a legacy config path when the new SyncAI config is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-config-migration-"));
    const legacyPath = join(dir, "CodexImageRouter", "config.json");
    const newPath = join(dir, "SyncAI", "config.json");
    const legacyStore = new ConfigStore(legacyPath);
    const legacyConfig = await legacyStore.load();
    legacyConfig.defaultRoutes.text = "mock-local";
    await legacyStore.save(legacyConfig);

    const migrated = await new ConfigStore(newPath, legacyPath).load();

    expect(migrated.defaultRoutes.text).toBe("mock-local");
    await expect(readFile(newPath, "utf8")).resolves.toContain('"text": "mock-local"');
  });

  test("rejects invalid config instead of silently accepting it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-config-"));
    const store = new ConfigStore(join(dir, "config.json"));

    await expect(
      store.save({
        activeRouteId: "missing",
        defaultRoutes: {},
        routes: [],
        activeProfileId: "missing",
        profiles: []
      })
    ).rejects.toThrow(/配置至少需要包含一个能力路由/);
  });

  test("migrates a legacy image profile into an image capability route", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-config-"));
    const path = join(dir, "config.json");
    await writeFile(
      path,
      JSON.stringify(
        {
          activeProfileId: "mock-local",
          profiles: [
            {
              id: "mock-local",
              name: "Mock Local",
              provider: "mock",
              baseUrl: "",
              model: "mock-image",
              secretEnvVar: "",
              outputDir: join(dir, "images"),
              allowConversationContext: false
            },
            {
              id: "custom",
              name: "Mock Local",
              provider: "mock",
              baseUrl: "",
              model: "mock-image",
              secretEnvVar: "",
              outputDir: join(dir, "custom-images"),
              allowConversationContext: false
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const config = await new ConfigStore(path).load();

    expect(config.activeRouteId).toBe("mock-local");
    expect(config.defaultRoutes.image).toBe("mock-local");
    expect(config.routes[0]).toMatchObject({
      id: "mock-local",
      name: "本地模拟",
      capabilities: ["image"]
    });
    expect(config.routes[1]).toMatchObject({
      id: "custom",
      name: "Mock Local",
      capabilities: ["image"]
    });
  });
});

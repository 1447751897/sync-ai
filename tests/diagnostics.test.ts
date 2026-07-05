import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { ConfigStore } from "../src/config/configStore.js";
import { defaultConfig } from "../src/config/defaults.js";
import { collectDiagnostics } from "../src/diagnostics/diagnostics.js";

describe("collectDiagnostics", () => {
  test("summarizes config, default routes, cc-switch and proxy checks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-diagnostics-"));
    const store = new ConfigStore(join(dir, "config.json"));
    const config = defaultConfig();
    config.defaultRoutes.text = "mock-local";
    await store.save(config);

    const report = await collectDiagnostics({
      store,
      port: 8756,
      listCcswitchProviders: async () => [
        {
          id: "kmkapi",
          name: "KMKAPI",
          appType: "codex",
          model: "gpt-5.5",
          baseUrl: "https://www.kamenking.top",
          wireApi: "responses",
          hasSecret: true,
          isCurrentCodex: true,
          capabilities: ["text"]
        }
      ],
      resolveProxy: async () => "http://127.0.0.1:7890"
    });

    expect(report.app).toMatchObject({
      name: "sync-ai",
      port: 8756
    });
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "config", status: "ok" }),
        expect.objectContaining({ id: "routes", status: "ok" }),
        expect.objectContaining({ id: "default-text", status: "ok" }),
        expect.objectContaining({ id: "default-image", status: "ok" }),
        expect.objectContaining({ id: "ccswitch", status: "ok" }),
        expect.objectContaining({ id: "proxy", status: "ok" })
      ])
    );
    expect(report.summary.error).toBe(0);
  });

  test("warns when default text route is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-diagnostics-"));
    const store = new ConfigStore(join(dir, "config.json"));
    await store.save(defaultConfig());

    const report = await collectDiagnostics({
      store,
      listCcswitchProviders: async () => [],
      resolveProxy: async () => undefined
    });

    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "default-text",
          status: "warning"
        })
      ])
    );
  });
});

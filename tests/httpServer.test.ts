import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vitest";

import { ConfigStore } from "../src/config/configStore.js";
import { createConfigHttpServer } from "../src/http/server.js";

const execFileAsync = promisify(execFile);

describe("config HTTP server", () => {
  let closeServer: undefined | (() => Promise<void>);

  afterEach(async () => {
    await closeServer?.();
    closeServer = undefined;
  });

  test("serves config JSON and updates active profile without exposing secrets", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-http-"));
    const store = new ConfigStore(join(dir, "config.json"));
    const server = createConfigHttpServer({ store });
    const address = await server.listen(0);
    closeServer = server.close;

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const getResponse = await fetch(`${baseUrl}/api/config`);
    const initial = await getResponse.json();

    expect(initial.activeProfileId).toBe("mock-local");
    expect(JSON.stringify(initial)).not.toContain("secret-value");

    const updated = {
      ...initial,
      activeProfileId: "mock-local",
      profiles: [
        {
          ...initial.profiles[0],
          name: "Updated Mock",
          secretEnvVar: "KMKAPI_IMAGE_API_KEY"
        }
      ]
    };
    const saveResponse = await fetch(`${baseUrl}/api/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updated)
    });

    expect(saveResponse.status).toBe(200);
    await expect(saveResponse.json()).resolves.toMatchObject({
      activeProfileId: "mock-local",
      profiles: [expect.objectContaining({ name: "Updated Mock" })]
    });
  });

  test("lists sanitized cc-switch providers and syncs them into routes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-http-"));
    const ccswitchRoot = await createFakeCcswitchRoot();
    const store = new ConfigStore(join(dir, "config.json"));
    const server = createConfigHttpServer({ store, ccswitchRoot });
    const address = await server.listen(0);
    closeServer = server.close;

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const providersResponse = await fetch(`${baseUrl}/api/ccswitch/providers`);
    const providers = await providersResponse.json();

    expect(providersResponse.status).toBe(200);
    expect(providers).toEqual([
      expect.objectContaining({ id: "kmkapi-text", capabilities: ["text"], hasSecret: true }),
      expect.objectContaining({ id: "kmkapi-image", capabilities: ["image"], hasSecret: true })
    ]);
    expect(JSON.stringify(providers)).not.toContain("secret-image");

    const syncResponse = await fetch(`${baseUrl}/api/config/sync-ccswitch`, { method: "POST" });
    const synced = await syncResponse.json();

    expect(syncResponse.status).toBe(200);
    expect(synced.defaultRoutes).toMatchObject({
      text: "ccswitch-kmkapi-text",
      image: "ccswitch-kmkapi-image"
    });
    expect(JSON.stringify(synced)).not.toContain("secret-image");
  });

  test("serves diagnostics, history and getting-started guide", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-http-"));
    const store = new ConfigStore(join(dir, "config.json"));
    const server = createConfigHttpServer({
      store,
      historyPath: join(dir, "history.json")
    });
    const address = await server.listen(0);
    closeServer = server.close;

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const diagnosticsResponse = await fetch(`${baseUrl}/api/diagnostics`);
    const diagnostics = await diagnosticsResponse.json();
    expect(diagnosticsResponse.status).toBe(200);
    expect(diagnostics.app.name).toBe("sync-ai");
    expect(diagnostics.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "config" })])
    );

    const historyResponse = await fetch(`${baseUrl}/api/history`);
    expect(historyResponse.status).toBe(200);
    await expect(historyResponse.json()).resolves.toEqual([]);

    const clearResponse = await fetch(`${baseUrl}/api/history/clear`, { method: "POST" });
    expect(clearResponse.status).toBe(200);
    await expect(clearResponse.json()).resolves.toEqual({ ok: true });

    const guideResponse = await fetch(`${baseUrl}/api/docs/getting-started`);
    const guide = await guideResponse.text();
    expect(guideResponse.status).toBe(200);
    expect(guide).toContain("sync-ai");
  });

  test("reports desktop plugin installer availability", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-http-desktop-"));
    const store = new ConfigStore(join(dir, "config.json"));
    const server = createConfigHttpServer({ store });
    const address = await server.listen(0);
    closeServer = server.close;

    const response = await fetch(`http://127.0.0.1:${address.port}/api/desktop/status`);
    const status = await response.json();

    expect(response.status).toBe(200);
    expect(status).toEqual(
      expect.objectContaining({
        appName: "sync-ai",
        canInstallPlugin: true
      })
    );
  });

  test("rejects listen when the requested port is already in use", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-http-port-"));
    const first = createConfigHttpServer({
      store: new ConfigStore(join(dir, "first.json"))
    });
    const address = await first.listen(0);
    closeServer = first.close;

    const second = createConfigHttpServer({
      store: new ConfigStore(join(dir, "second.json"))
    });

    await expect(second.listen(address.port)).rejects.toThrow();
    await second.close().catch(() => undefined);
  });
});

async function createFakeCcswitchRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cc-switch-http-fake-"));
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "settings.json"),
    JSON.stringify({ currentProviderCodex: "kmkapi-text" }, null, 2),
    "utf8"
  );

  const dbPath = join(root, "cc-switch.db");
  const script = `
import json, sqlite3, sys
db = sys.argv[1]
conn = sqlite3.connect(db)
conn.execute("""create table providers (
  id text primary key,
  app_type text,
  name text,
  settings_config text,
  website_url text,
  category text,
  created_at text,
  sort_index integer,
  notes text,
  icon text,
  icon_color text,
  meta text,
  is_current integer,
  in_failover_queue integer,
  cost_multiplier real,
  limit_daily_usd real,
  limit_monthly_usd real,
  provider_type text
)""")
def insert_provider(id, name, model, secret):
    config = {
      "auth": {"OPENAI_API_KEY": secret},
      "config": f'''model_provider = "custom"\\nmodel = "{model}"\\n[model_providers.custom]\\nname = "{name}"\\nbase_url = "https://www.kamenking.top"\\nwire_api = "responses"\\nrequires_openai_auth = true\\n'''
    }
    conn.execute("insert into providers (id, app_type, name, settings_config) values (?, 'codex', ?, ?)", (id, name, json.dumps(config)))
insert_provider("kmkapi-text", "KMKAPI", "gpt-5.5", "secret-text")
insert_provider("kmkapi-image", "KMKAPI-IMAGE", "gpt-image-test", "secret-image")
conn.commit()
conn.close()
`;
  await execFileAsync("python", ["-c", script, dbPath]);
  return root;
}

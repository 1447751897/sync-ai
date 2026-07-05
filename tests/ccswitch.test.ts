import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

import { listCcswitchProviders, resolveCcswitchSecret, syncCcswitchRoutes } from "../src/ccswitch/index.js";
import { defaultConfig } from "../src/config/defaults.js";

const execFileAsync = promisify(execFile);

describe("cc-switch integration", () => {
  test("lists sanitized codex providers and infers capabilities", async () => {
    const root = await createFakeCcswitchRoot();

    const providers = await listCcswitchProviders({ root });

    expect(providers).toEqual([
      expect.objectContaining({
        id: "kmkapi-text",
        name: "KMKAPI",
        appType: "codex",
        model: "gpt-5.5",
        baseUrl: "https://www.kamenking.top",
        capabilities: ["text"],
        hasSecret: true,
        isCurrentCodex: true
      }),
      expect.objectContaining({
        id: "kmkapi-image",
        name: "KMKAPI-IMAGE",
        appType: "codex",
        model: "gpt-image-test",
        baseUrl: "https://www.kamenking.top",
        capabilities: ["image"],
        hasSecret: true,
        isCurrentCodex: false
      })
    ]);
    expect(JSON.stringify(providers)).not.toContain("secret-text");
    expect(JSON.stringify(providers)).not.toContain("secret-image");
  });

  test("syncs cc-switch providers into capability routes without storing secrets", async () => {
    const root = await createFakeCcswitchRoot();
    const config = defaultConfig();

    const synced = await syncCcswitchRoutes(config, { root });

    expect(synced.defaultRoutes.text).toBe("ccswitch-kmkapi-text");
    expect(synced.defaultRoutes.image).toBe("ccswitch-kmkapi-image");
    expect(synced.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ccswitch-kmkapi-text",
          name: "KMKAPI",
          capabilities: ["text"],
          secretSource: "cc-switch",
          ccswitchProviderId: "kmkapi-text",
          secretEnvVar: ""
        }),
        expect.objectContaining({
          id: "ccswitch-kmkapi-image",
          name: "KMKAPI-IMAGE",
          capabilities: ["image"],
          secretSource: "cc-switch",
          ccswitchProviderId: "kmkapi-image",
          secretEnvVar: ""
        })
      ])
    );
    expect(JSON.stringify(synced)).not.toContain("secret-text");
    expect(JSON.stringify(synced)).not.toContain("secret-image");
  });

  test("resolves a cc-switch secret only when explicitly requested", async () => {
    const root = await createFakeCcswitchRoot();

    await expect(resolveCcswitchSecret("kmkapi-image", { root })).resolves.toBe("secret-image");
  });
});

async function createFakeCcswitchRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cc-switch-fake-"));
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

import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import type { CcswitchProvider, CcswitchReadOptions } from "./types.js";

const execFileAsync = promisify(execFile);

export function defaultCcswitchRoot(): string {
  return join(homedir(), ".cc-switch");
}

export async function readCcswitchProviders(
  options: CcswitchReadOptions = {}
): Promise<CcswitchProvider[]> {
  const output = await runPythonJson(options, LIST_PROVIDERS_SCRIPT, [resolveRoot(options)]);
  return output as CcswitchProvider[];
}

export async function readCcswitchSecret(
  providerId: string,
  options: CcswitchReadOptions = {}
): Promise<string> {
  const output = await runPythonJson(options, RESOLVE_SECRET_SCRIPT, [resolveRoot(options), providerId]);
  if (!isRecord(output) || typeof output.secret !== "string" || output.secret.length === 0) {
    throw new Error(`cc-switch provider ${providerId} 没有可用鉴权信息`);
  }
  return output.secret;
}

async function runPythonJson(
  options: CcswitchReadOptions,
  script: string,
  args: string[]
): Promise<unknown> {
  const python = options.pythonCommand ?? process.env.CODEX_IMAGE_ROUTER_PYTHON ?? "python";
  try {
    const { stdout } = await execFileAsync(python, ["-c", script, ...args], {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4
    });
    return JSON.parse(stdout);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`读取 cc-switch 失败：${error.message}`);
    }
    throw error;
  }
}

function resolveRoot(options: CcswitchReadOptions): string {
  return options.root ?? process.env.CCSWITCH_HOME ?? defaultCcswitchRoot();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const COMMON_PYTHON = String.raw`
import json, pathlib, re, sqlite3, sys

def load_settings(root):
    path = root / "settings.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def open_db(root):
    db = root / "cc-switch.db"
    if not db.exists():
        raise FileNotFoundError(str(db))
    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn

def parse_settings_config(raw):
    try:
        data = json.loads(raw or "{}")
    except Exception:
        data = {}
    config = data.get("config") or ""
    auth = data.get("auth") or {}
    secret = ""
    if isinstance(auth, dict):
        secret = auth.get("OPENAI_API_KEY") or auth.get("api_key") or ""
    model = pick_config_value(config, "model")
    base_url = pick_config_value(config, "base_url")
    wire_api = pick_config_value(config, "wire_api")
    return {
        "model": model,
        "baseUrl": base_url,
        "wireApi": wire_api,
        "hasSecret": bool(secret),
        "secret": secret,
    }

def pick_config_value(config, key):
    match = re.search(r"(?m)^\s*" + re.escape(key) + r"\s*=\s*[\"']([^\"']+)[\"']", config)
    return match.group(1) if match else ""

def infer_capabilities(name, model):
    text = f"{name} {model}".upper()
    if "IMAGE" in text or "IMG" in text:
        return ["image"]
    caps = []
    if "VISION" in text or "VL" in text:
        caps.append("vision")
    if "CODE" in text:
        caps.append("code")
    if not caps:
        caps.append("text")
    elif "text" not in caps:
        caps.append("text")
    return caps
`;

const LIST_PROVIDERS_SCRIPT = `${COMMON_PYTHON}
root = pathlib.Path(sys.argv[1])
settings = load_settings(root)
current = settings.get("currentProviderCodex")
conn = open_db(root)
rows = conn.execute("""select id, app_type, name, settings_config, sort_index
from providers
where app_type = 'codex'
order by coalesce(sort_index, 999999), id""").fetchall()
providers = []
for row in rows:
    parsed = parse_settings_config(row["settings_config"])
    providers.append({
        "id": row["id"],
        "name": row["name"] or row["id"],
        "appType": row["app_type"] or "",
        "model": parsed["model"],
        "baseUrl": parsed["baseUrl"],
        "wireApi": parsed["wireApi"],
        "hasSecret": parsed["hasSecret"],
        "isCurrentCodex": row["id"] == current,
        "capabilities": infer_capabilities(row["name"] or row["id"], parsed["model"]),
    })
providers.sort(key=lambda item: (not item["isCurrentCodex"], item["name"].upper(), item["id"]))
conn.close()
print(json.dumps(providers, ensure_ascii=False))
`;

const RESOLVE_SECRET_SCRIPT = `${COMMON_PYTHON}
root = pathlib.Path(sys.argv[1])
provider_id = sys.argv[2]
conn = open_db(root)
row = conn.execute("select settings_config from providers where id = ?", (provider_id,)).fetchone()
conn.close()
if row is None:
    raise KeyError(provider_id)
parsed = parse_settings_config(row["settings_config"])
print(json.dumps({"secret": parsed["secret"]}, ensure_ascii=False))
`;

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { defaultConfig } from "./defaults.js";
import { routerConfigSchema, type RouterConfig } from "./schema.js";

export function defaultConfigPath(): string {
  return (
    process.env.CODEX_IMAGE_ROUTER_CONFIG ??
    join(process.env.LOCALAPPDATA ?? process.cwd(), "SyncAI", "config.json")
  );
}

export function legacyConfigPath(): string {
  return join(process.env.LOCALAPPDATA ?? process.cwd(), "CodexImageRouter", "config.json");
}

export class ConfigStore {
  private readonly fallbackLegacyPath?: string;

  constructor(
    private readonly configPath = defaultConfigPath(),
    fallbackLegacyPath?: string
  ) {
    this.fallbackLegacyPath =
      fallbackLegacyPath ?? (configPath === defaultConfigPath() ? legacyConfigPath() : undefined);
  }

  async load(): Promise<RouterConfig> {
    try {
      const raw = await readFile(this.configPath, "utf8");
      return routerConfigSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isFileMissing(error)) {
        const migrated = await this.tryMigrateLegacyConfig();
        if (migrated) {
          return migrated;
        }
        const config = defaultConfig();
        await this.save(config);
        return config;
      }
      throw error;
    }
  }

  async save(config: RouterConfig): Promise<RouterConfig> {
    const parsed = routerConfigSchema.parse(config);
    await mkdir(dirname(this.configPath), { recursive: true });
    const tempPath = `${this.configPath}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    await rename(tempPath, this.configPath);
    return parsed;
  }

  private async tryMigrateLegacyConfig(): Promise<RouterConfig | undefined> {
    if (!this.fallbackLegacyPath || this.fallbackLegacyPath === this.configPath) {
      return undefined;
    }
    try {
      const raw = await readFile(this.fallbackLegacyPath, "utf8");
      const parsed = routerConfigSchema.parse(JSON.parse(raw));
      await this.save(parsed);
      return parsed;
    } catch (error) {
      if (isFileMissing(error)) {
        return undefined;
      }
      throw error;
    }
  }
}

function isFileMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

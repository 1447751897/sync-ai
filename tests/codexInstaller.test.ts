import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { describe, expect, test } from "vitest";

import { installCodexPlugin } from "../src/desktop/codexInstaller.js";

describe("installCodexPlugin", () => {
  test("creates a local marketplace and runs Codex marketplace/plugin install commands", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-installer-"));
    const appRoot = join(dir, "app");
    const localAppData = join(dir, "local-app-data");
    await mkdir(join(appRoot, ".codex-plugin"), { recursive: true });
    await writeFile(
      join(appRoot, ".codex-plugin", "plugin.json"),
      JSON.stringify({ name: "sync-ai", version: "0.1.0" }),
      "utf8"
    );

    const commands: Array<{ file: string; args: string[] }> = [];
    const result = await installCodexPlugin({
      appRoot,
      localAppData,
      codexExecutable: "C:\\fake\\codex.exe",
      runCommand: async (file, args) => {
        commands.push({ file, args });
        return JSON.stringify({ ok: true });
      }
    });

    const marketplaceJson = JSON.parse(
      await readFile(join(localAppData, "SyncAI", "marketplace", ".agents", "plugins", "marketplace.json"), "utf8")
    );
    expect(marketplaceJson).toMatchObject({
      name: "sync-ai-local",
      plugins: [
        expect.objectContaining({
          name: "sync-ai",
          source: { source: "local", path: "./plugins/sync-ai" }
        })
      ]
    });
    expect(commands.map((command) => command.args)).toEqual([
      ["plugin", "marketplace", "add", result.marketplaceRoot, "--json"],
      ["plugin", "add", "sync-ai@sync-ai-local", "--json"]
    ]);
    expect(result.pluginId).toBe("sync-ai@sync-ai-local");
  });

  test("prefers the stable LocalAppData Codex executable over PATH lookup", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sync-ai-installer-"));
    const appRoot = join(dir, "app");
    const localAppData = join(dir, "local-app-data");
    const stableCodex = join(localAppData, "OpenAI", "Codex", "bin", "stable-version", "codex.exe");
    await mkdir(join(appRoot, ".codex-plugin"), { recursive: true });
    await mkdir(join(localAppData, "OpenAI", "Codex", "bin", "stable-version"), { recursive: true });
    await writeFile(
      join(appRoot, ".codex-plugin", "plugin.json"),
      JSON.stringify({ name: "sync-ai", version: "0.1.0" }),
      "utf8"
    );
    await writeFile(stableCodex, "fake exe", "utf8");

    const commands: Array<{ file: string; args: string[] }> = [];
    const result = await installCodexPlugin({
      appRoot,
      localAppData,
      runCommand: async (file, args) => {
        commands.push({ file, args });
        return JSON.stringify({ ok: true });
      }
    });

    expect(result.codexExecutable).toBe(stableCodex);
    expect(commands.every((command) => command.file === stableCodex)).toBe(true);
  });
});

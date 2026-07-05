import { execFile } from "node:child_process";
import { access, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type InstallCodexPluginResult = {
  pluginId: "sync-ai@sync-ai-local";
  marketplaceRoot: string;
  codexExecutable: string;
  marketplaceAddOutput: unknown;
  pluginAddOutput: unknown;
};

export async function installCodexPlugin(options: {
  appRoot?: string;
  localAppData?: string;
  codexExecutable?: string;
  runCommand?: (file: string, args: string[]) => Promise<string>;
} = {}): Promise<InstallCodexPluginResult> {
  const appRoot = options.appRoot ?? process.env.SYNC_AI_APP_ROOT ?? process.cwd();
  await assertSyncAiPluginRoot(appRoot);
  const localAppData = options.localAppData ?? process.env.LOCALAPPDATA ?? process.cwd();
  const marketplaceRoot = join(localAppData, "SyncAI", "marketplace");
  await prepareMarketplace({ marketplaceRoot, appRoot });

  const codexExecutable = options.codexExecutable ?? (await findCodexExecutable(localAppData));
  const runCommand = options.runCommand ?? runCommandDefault;
  const marketplaceAddOutput = parseJsonOrText(
    await runCommand(codexExecutable, ["plugin", "marketplace", "add", marketplaceRoot, "--json"])
  );
  const pluginAddOutput = parseJsonOrText(
    await runCommand(codexExecutable, ["plugin", "add", "sync-ai@sync-ai-local", "--json"])
  );

  return {
    pluginId: "sync-ai@sync-ai-local",
    marketplaceRoot,
    codexExecutable,
    marketplaceAddOutput,
    pluginAddOutput
  };
}

async function prepareMarketplace(args: { marketplaceRoot: string; appRoot: string }): Promise<void> {
  const pluginsRoot = join(args.marketplaceRoot, "plugins");
  const pluginLink = join(pluginsRoot, "sync-ai");
  await mkdir(join(args.marketplaceRoot, ".agents", "plugins"), { recursive: true });
  await mkdir(pluginsRoot, { recursive: true });
  await rm(pluginLink, { recursive: true, force: true });
  await symlink(args.appRoot, pluginLink, "junction");
  await writeFile(
    join(args.marketplaceRoot, ".agents", "plugins", "marketplace.json"),
    `${JSON.stringify(
      {
        name: "sync-ai-local",
        interface: { displayName: "sync-ai Local" },
        plugins: [
          {
            name: "sync-ai",
            source: { source: "local", path: "./plugins/sync-ai" },
            policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
            category: "Developer Tools"
          }
        ]
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

async function assertSyncAiPluginRoot(appRoot: string): Promise<void> {
  const raw = await readFile(join(appRoot, ".codex-plugin", "plugin.json"), "utf8");
  const parsed = JSON.parse(raw);
  if (parsed.name !== "sync-ai") {
    throw new Error(`当前目录不是 sync-ai 插件根目录：${appRoot}`);
  }
}

async function findCodexExecutable(localAppData?: string): Promise<string> {
  if (process.env.SYNC_AI_CODEX_EXE) {
    return process.env.SYNC_AI_CODEX_EXE;
  }

  const localCodexExecutable = await findLocalCodexExecutable(localAppData);
  if (localCodexExecutable) {
    return localCodexExecutable;
  }

  const fromPath = await runCommandDefault("where.exe", ["codex"]).catch(() => "");
  const lines = fromPath
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("codex.exe"));
  const first = lines.find((line) => !line.toLowerCase().includes("\\windowsapps\\"));
  if (first) {
    return first;
  }
  throw new Error("未找到 Codex CLI。请先安装 Codex App，或设置 SYNC_AI_CODEX_EXE 指向 codex.exe。");
}

async function runCommandDefault(file: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 8
    });
    return stdout || stderr;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EPERM") {
      throw new Error(
        `无法启动 Codex CLI：${file}。如果该路径位于 WindowsApps，请设置 SYNC_AI_CODEX_EXE 指向 %LOCALAPPDATA%\\OpenAI\\Codex\\bin\\<版本>\\codex.exe。`
      );
    }
    throw error;
  }
}

async function findLocalCodexExecutable(localAppData?: string): Promise<string | undefined> {
  if (!localAppData) {
    return undefined;
  }
  const binRoot = join(localAppData, "OpenAI", "Codex", "bin");
  try {
    const entries = await readdir(binRoot, { withFileTypes: true });
    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const executable = join(binRoot, entry.name, "codex.exe");
          try {
            await access(executable);
            const info = await stat(executable);
            return { executable, mtimeMs: info.mtimeMs };
          } catch {
            return undefined;
          }
        })
    );
    return candidates
      .filter((candidate): candidate is { executable: string; mtimeMs: number } => Boolean(candidate))
      .sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.executable;
  } catch {
    return undefined;
  }
}

function parseJsonOrText(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return output.trim();
  }
}

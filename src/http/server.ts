import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listCcswitchProviders, syncCcswitchRoutes } from "../ccswitch/index.js";
import { ConfigStore } from "../config/configStore.js";
import { routerConfigSchema } from "../config/schema.js";
import { collectDiagnostics } from "../diagnostics/diagnostics.js";
import { installCodexPlugin } from "../desktop/codexInstaller.js";
import { HistoryStore } from "../history/historyStore.js";

type ConfigHttpServerOptions = {
  store?: ConfigStore;
  ccswitchRoot?: string;
  historyPath?: string;
};

export function createConfigHttpServer(args: ConfigHttpServerOptions = {}) {
  const store = args.store ?? new ConfigStore();
  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response, {
        store,
        ccswitchRoot: args.ccswitchRoot,
        historyStore: new HistoryStore(args.historyPath)
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "服务器内部错误"
      });
    }
  });

  return {
    listen: (port: number) =>
      new Promise<{ port: number }>((resolveListen, rejectListen) => {
        const onError = (error: Error) => {
          server.off("listening", onListening);
          rejectListen(error);
        };
        const onListening = () => {
          server.off("error", onError);
          const address = server.address();
          resolveListen({ port: typeof address === "object" && address ? address.port : port });
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, "127.0.0.1", () => {
          // handled by the one-time "listening" listener above
        });
      }),
    close: () =>
      new Promise<void>((resolveClose, reject) => {
        server.close((error) => (error ? reject(error) : resolveClose()));
      })
  };
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: { store: ConfigStore; ccswitchRoot?: string; historyStore: HistoryStore }
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/api/config") {
    sendJson(response, 200, await context.store.load());
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/config") {
    const body = await readBody(request);
    const config = routerConfigSchema.parse(JSON.parse(body));
    sendJson(response, 200, await context.store.save(config));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/ccswitch/providers") {
    sendJson(response, 200, await listCcswitchProviders({ root: context.ccswitchRoot }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/config/sync-ccswitch") {
    const config = await context.store.load();
    const synced = await syncCcswitchRoutes(config, { root: context.ccswitchRoot });
    sendJson(response, 200, await context.store.save(synced));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/diagnostics") {
    sendJson(
      response,
      200,
      await collectDiagnostics({
        store: context.store,
        ccswitchRoot: context.ccswitchRoot,
        port: Number(process.env.CODEX_IMAGE_ROUTER_PORT ?? 8756)
      })
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/history") {
    sendJson(response, 200, await context.historyStore.read());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/history/clear") {
    await context.historyStore.clear();
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/docs/getting-started") {
    response.writeHead(200, { "content-type": "text/markdown; charset=utf-8" });
    response.end(gettingStartedGuide());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/desktop/status") {
    sendJson(response, 200, {
      appName: "sync-ai",
      canInstallPlugin: true,
      appRoot: process.env.SYNC_AI_APP_ROOT ?? process.cwd()
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/desktop/install-plugin") {
    sendJson(response, 200, await installCodexPlugin());
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(await readStaticIndex());
    return;
  }

  sendJson(response, 404, { error: "未找到" });
}

function gettingStartedGuide(): string {
  return `# sync-ai 快速开始

sync-ai 是一个本地 Codex 多模型能力路由插件。它让 Codex 在同一个对话中按任务临时调用文本、图片、视觉、代码等 provider。

## 推荐流程

1. 打开本地控制台：http://127.0.0.1:8756/
2. 点击“同步 cc-switch”。
3. 检查默认文本能力和默认图片能力。
4. 打开“诊断”确认配置、cc-switch 和代理状态。
5. 回到 Codex，对需要额外能力的任务调用 sync-ai 工具。

## 安全模型

- sync-ai 不在页面展示真实 API Key。
- cc-switch token 只在运行时读取。
- 诊断报告和历史记录会做脱敏处理。
`;
}

async function readStaticIndex(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, "static", "index.html"),
    resolve(process.cwd(), "src", "http", "static", "index.html")
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch (error) {
      if (!isMissingFile(error)) {
        throw error;
      }
    }
  }
  throw new Error("无法找到配置页面静态文件 index.html");
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.CODEX_IMAGE_ROUTER_PORT ?? 8756);
  const server = createConfigHttpServer();
  await server.listen(port);
  console.log(`Codex 能力路由配置页面：http://127.0.0.1:${port}`);
}

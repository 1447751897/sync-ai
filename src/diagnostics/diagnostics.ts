import { listCcswitchProviders } from "../ccswitch/index.js";
import type { CcswitchProvider } from "../ccswitch/types.js";
import { ConfigStore, defaultConfigPath } from "../config/configStore.js";
import { resolveProxyForUrl } from "../network/proxyFetch.js";

export type DiagnosticStatus = "ok" | "warning" | "error";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  message: string;
};

export type DiagnosticsReport = {
  app: {
    name: "sync-ai";
    version: string;
    configPath: string;
    port: number;
  };
  checks: DiagnosticCheck[];
  summary: Record<DiagnosticStatus, number>;
  generatedAt: string;
};

export async function collectDiagnostics(args: {
  store: ConfigStore;
  ccswitchRoot?: string;
  port?: number;
  listCcswitchProviders?: () => Promise<CcswitchProvider[]>;
  resolveProxy?: () => Promise<string | undefined>;
}): Promise<DiagnosticsReport> {
  const checks: DiagnosticCheck[] = [];
  const config = await args.store.load();
  checks.push({
    id: "config",
    label: "配置文件",
    status: "ok",
    message: "配置文件可读取且结构有效"
  });

  checks.push({
    id: "routes",
    label: "能力路由",
    status: config.routes.length > 0 ? "ok" : "error",
    message: config.routes.length > 0 ? `已配置 ${config.routes.length} 个能力路由` : "没有可用能力路由"
  });

  checks.push(defaultRouteCheck("default-text", "默认文本能力", config.defaultRoutes.text));
  checks.push(defaultRouteCheck("default-image", "默认图片能力", config.defaultRoutes.image));

  const providerReader =
    args.listCcswitchProviders ?? (() => listCcswitchProviders({ root: args.ccswitchRoot }));
  try {
    const providers = await providerReader();
    checks.push({
      id: "ccswitch",
      label: "cc-switch",
      status: providers.length > 0 ? "ok" : "warning",
      message:
        providers.length > 0
          ? `已读取 ${providers.length} 个 cc-switch Codex provider`
          : "未读取到 cc-switch provider，可手动添加 OpenAI 兼容路由"
    });
  } catch (error) {
    checks.push({
      id: "ccswitch",
      label: "cc-switch",
      status: "warning",
      message: `cc-switch 读取失败：${error instanceof Error ? error.message : String(error)}`
    });
  }

  const proxyResolver =
    args.resolveProxy ?? (() => resolveProxyForUrl(new URL("https://www.kamenking.top"), { env: {} }));
  try {
    const proxy = await proxyResolver();
    checks.push({
      id: "proxy",
      label: "系统代理",
      status: proxy ? "ok" : "warning",
      message: proxy ? `检测到代理 ${proxy}` : "未检测到代理；如果 provider 需要代理，请先打开系统代理"
    });
  } catch (error) {
    checks.push({
      id: "proxy",
      label: "系统代理",
      status: "warning",
      message: `代理检测失败：${error instanceof Error ? error.message : String(error)}`
    });
  }

  return {
    app: {
      name: "sync-ai",
      version: "0.1.0",
      configPath: defaultConfigPath(),
      port: args.port ?? Number(process.env.CODEX_IMAGE_ROUTER_PORT ?? 8756)
    },
    checks,
    summary: summarize(checks),
    generatedAt: new Date().toISOString()
  };
}

function defaultRouteCheck(
  id: string,
  label: string,
  routeId: string | undefined
): DiagnosticCheck {
  return {
    id,
    label,
    status: routeId ? "ok" : "warning",
    message: routeId ? `已设置为 ${routeId}` : "未设置默认路由"
  };
}

function summarize(checks: DiagnosticCheck[]): Record<DiagnosticStatus, number> {
  return checks.reduce<Record<DiagnosticStatus, number>>(
    (summary, check) => {
      summary[check.status] += 1;
      return summary;
    },
    { ok: 0, warning: 0, error: 0 }
  );
}

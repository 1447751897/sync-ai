import { resolveCcswitchSecret } from "../ccswitch/index.js";
import {
  routerConfigSchema,
  type Capability,
  type CapabilityRoute,
  type RouterConfig
} from "../config/schema.js";
import { HistoryStore, type HistoryRecord } from "../history/historyStore.js";
import { createProxyAwareFetch } from "../network/proxyFetch.js";
import {
  callOpenAiCompatibleModel,
  callWithMockProvider,
  generateWithMockProvider,
  generateWithOpenAiCompatibleProvider
} from "./providers.js";
import type { CallModelRequest, CallModelResult, FetchLike, GenerateImageRequest, GenerateImageResult } from "./types.js";

export class CapabilityRouter {
  private readonly config: RouterConfig;
  private readonly fetchImpl: FetchLike;
  private readonly env: Record<string, string | undefined>;
  private readonly ccswitchRoot?: string;
  private readonly historyStore?: Pick<HistoryStore, "append">;

  constructor(args: {
    config: RouterConfig;
    fetchImpl?: FetchLike;
    env?: Record<string, string | undefined>;
    ccswitchRoot?: string;
    historyStore?: Pick<HistoryStore, "append">;
  }) {
    this.config = routerConfigSchema.parse(args.config);
    this.fetchImpl = args.fetchImpl ?? createProxyAwareFetch();
    this.env = args.env ?? process.env;
    this.ccswitchRoot = args.ccswitchRoot;
    this.historyStore = args.historyStore ?? new HistoryStore();
  }

  async callModel(request: CallModelRequest): Promise<CallModelResult> {
    const route = this.selectRoute(request.routeId, request.capability ?? "text");
    try {
      const result =
        route.provider === "mock"
          ? await callWithMockProvider(route, request)
          : await callOpenAiCompatibleModel({
              route,
              request,
              fetchImpl: this.fetchImpl,
              secret: await this.resolveSecret(route)
            });
      await this.recordHistory({
        id: result.id,
        type: "text",
        route,
        status: "success",
        summary: "文本能力调用成功"
      });
      return result;
    } catch (error) {
      await this.recordHistory({
        id: createHistoryId("text-error"),
        type: "text",
        route,
        status: "error",
        summary: formatErrorSummary(error)
      });
      throw error;
    }
  }

  async generateImage(request: GenerateImageRequest): Promise<GenerateImageResult> {
    const route = this.selectRoute(request.routeId ?? request.profileId, "image");
    try {
      const result =
        route.provider === "mock"
          ? await generateWithMockProvider(route, request)
          : await generateWithOpenAiCompatibleProvider({
              route,
              request,
              fetchImpl: this.fetchImpl,
              secret: await this.resolveSecret(route)
            });
      await this.recordHistory({
        id: result.id,
        type: "image",
        route,
        status: "success",
        summary: "图片能力调用成功",
        imagePath: result.imagePath,
        metadataPath: result.metadataPath
      });
      return result;
    } catch (error) {
      await this.recordHistory({
        id: createHistoryId("image-error"),
        type: "image",
        route,
        status: "error",
        summary: formatErrorSummary(error)
      });
      throw error;
    }
  }

  private selectRoute(routeId: string | undefined, capability: Capability): CapabilityRoute {
    const explicitRoute = routeId ? this.config.routes.find((route) => route.id === routeId) : undefined;
    const defaultRouteId = this.config.defaultRoutes[capability];
    const defaultRoute = defaultRouteId
      ? this.config.routes.find((route) => route.id === defaultRouteId)
      : undefined;
    const capabilityRoute = this.config.routes.find((route) => route.capabilities.includes(capability));
    const activeRoute = this.config.routes.find((route) => route.id === this.config.activeRouteId);
    const route = explicitRoute ?? defaultRoute ?? capabilityRoute ?? activeRoute;

    if (!route) {
      throw new Error(`未找到可用的 ${capability} 能力路由`);
    }
    return route;
  }

  private async resolveSecret(route: CapabilityRoute): Promise<string> {
    if (route.provider === "mock") {
      return "";
    }
    if (route.secretSource === "cc-switch") {
      if (!route.ccswitchProviderId) {
        throw new Error(`能力路由 ${route.id} 缺少 cc-switch provider id`);
      }
      return resolveCcswitchSecret(route.ccswitchProviderId, { root: this.ccswitchRoot });
    }
    const secret = route.secretEnvVar ? this.env[route.secretEnvVar] : undefined;
    if (!route.secretEnvVar || !secret) {
      throw new Error(`缺少 API Key 环境变量：${route.secretEnvVar || "(未配置)"}`);
    }
    return secret;
  }

  private async recordHistory(args: {
    id: string;
    type: HistoryRecord["type"];
    route: CapabilityRoute;
    status: HistoryRecord["status"];
    summary: string;
    imagePath?: string;
    metadataPath?: string;
  }): Promise<void> {
    try {
      await this.historyStore?.append({
        id: args.id,
        type: args.type,
        routeId: args.route.id,
        provider: args.route.provider,
        model: args.route.model,
        status: args.status,
        summary: args.summary,
        ...(args.imagePath ? { imagePath: args.imagePath } : {}),
        ...(args.metadataPath ? { metadataPath: args.metadataPath } : {}),
        createdAt: new Date().toISOString()
      });
    } catch {
      // 历史记录不能影响主调用结果。
    }
  }
}

function createHistoryId(suffix: string): string {
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${suffix}`;
}

function formatErrorSummary(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${redactSensitiveText(error.message)}`;
  }
  return redactSensitiveText(String(error));
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._-]+/g, "sk-[redacted]");
}

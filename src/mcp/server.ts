#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import * as z from "zod/v4";

import { ConfigStore } from "../config/configStore.js";
import { CapabilityRouter } from "../router/capabilityRouter.js";
import { toPublicConfig } from "./publicConfig.js";

const CONFIG_PAGE_PORT = Number(process.env.CODEX_IMAGE_ROUTER_PORT ?? 8756);

export function createMcpServer(args: { store?: ConfigStore } = {}): McpServer {
  const store = args.store ?? new ConfigStore();
  const server = new McpServer({
    name: "codex-capability-router",
    version: "0.2.0"
  });

  server.registerTool(
    "call_model",
    {
      title: "调用其他模型",
      description:
        "在不切换当前 Codex 主对话模型的情况下，通过已配置的能力路由临时调用其他文本/代码/视觉模型。",
      inputSchema: {
        prompt: z.string().min(1).describe("要发送给目标模型的任务或问题"),
        capability: z
          .enum(["text", "vision", "code", "other"])
          .optional()
          .describe("要使用的能力类型，默认 text"),
        routeId: z.string().optional().describe("可选能力路由 ID，用于临时覆盖默认路由"),
        conversationContext: z
          .string()
          .optional()
          .describe("可选对话上下文，仅在对应路由允许时发送")
      },
      outputSchema: {
        id: z.string(),
        routeId: z.string(),
        provider: z.string(),
        model: z.string(),
        text: z.string(),
        createdAt: z.string()
      }
    },
    async (request) => {
      const config = await store.load();
      const router = new CapabilityRouter({ config });
      const result = await router.callModel(request);
      return jsonToolResult(result);
    }
  );

  server.registerTool(
    "generate_image",
    {
      title: "生成图片",
      description:
        "通过默认图片能力路由生成图片，并返回本地图片文件路径。通常会自动使用 cc-switch 中的 KMKAPI-IMAGE。",
      inputSchema: {
        prompt: z.string().min(1).describe("图片提示词"),
        size: z.string().optional().describe("图片尺寸，例如 1024x1024 或 1536x864"),
        routeId: z.string().optional().describe("可选能力路由 ID，用于临时覆盖默认图片路由"),
        profileId: z.string().optional().describe("兼容旧版的档案 ID，等同 routeId"),
        conversationContext: z
          .string()
          .optional()
          .describe("可选对话上下文，仅在对应路由允许时发送")
      },
      outputSchema: {
        id: z.string(),
        imagePath: z.string(),
        metadataPath: z.string(),
        provider: z.string(),
        profileId: z.string(),
        routeId: z.string(),
        model: z.string(),
        createdAt: z.string()
      }
    },
    async (request) => {
      const config = await store.load();
      const router = new CapabilityRouter({ config });
      const result = await router.generateImage(request);
      const structuredContent = {
        id: result.id,
        imagePath: result.imagePath,
        metadataPath: result.metadataPath,
        provider: result.provider,
        profileId: result.profileId,
        routeId: result.routeId,
        model: result.model,
        createdAt: result.createdAt
      };

      return jsonToolResult(structuredContent);
    }
  );

  server.registerTool(
    "get_config",
    {
      title: "读取能力路由配置",
      description: "读取当前能力路由配置。不会返回任何真实密钥值。",
      outputSchema: {
        activeRouteId: z.string(),
        defaultRoutes: z.record(z.string(), z.string().optional()),
        routes: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            provider: z.string(),
            capabilities: z.array(z.string()),
            baseUrl: z.string(),
            model: z.string(),
            secretSource: z.string(),
            secretEnvVar: z.string(),
            ccswitchProviderId: z.string(),
            outputDir: z.string(),
            allowConversationContext: z.boolean()
          })
        )
      }
    },
    async () => jsonToolResult(toPublicConfig(await store.load()))
  );

  server.registerTool(
    "get_config_page_url",
    {
      title: "获取配置页面地址",
      description: "返回 Codex 能力路由器本地配置页面的 URL。",
      outputSchema: {
        url: z.string()
      }
    },
    async () => {
      const structuredContent = {
        url: `http://127.0.0.1:${CONFIG_PAGE_PORT}`
      };
      return {
        content: [{ type: "text", text: structuredContent.url }],
        structuredContent
      };
    }
  );

  return server;
}

function jsonToolResult<T extends Record<string, unknown>>(structuredContent: T) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent, null, 2)
      }
    ],
    structuredContent
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Codex 能力路由器 MCP 服务已在 stdio 上运行");
}

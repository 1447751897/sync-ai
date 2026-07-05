import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

import { CapabilityRouter } from "../src/router/capabilityRouter.js";
import type { FetchLike } from "../src/router/types.js";
import type { RouterConfig } from "../src/config/schema.js";
import type { HistoryStore } from "../src/history/historyStore.js";

describe("CapabilityRouter", () => {
  test("calls the default text route through the Responses API", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      return new Response(
        JSON.stringify({
          output_text: "你好，这是外部模型结果"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const config = createConfig();
    const router = new CapabilityRouter({
      config,
      fetchImpl,
      env: { KMKAPI_API_KEY: "secret-text" }
    });

    const result = await router.callModel({
      prompt: "总结这段内容",
      capability: "text",
      conversationContext: "上下文"
    });

    expect(result.text).toBe("你好，这是外部模型结果");
    expect(result.routeId).toBe("kmkapi-text");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://www.kamenking.top/v1/responses");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer secret-text",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-5.5",
      input: "总结这段内容\n\n对话上下文：\n上下文"
    });
  });

  test("records successful text calls in history", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      return new Response(JSON.stringify({ output_text: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const historyStore = createMemoryHistoryStore();
    const router = new CapabilityRouter({
      config: createConfig(),
      fetchImpl,
      env: { KMKAPI_API_KEY: "secret-text" },
      historyStore
    });

    await router.callModel({ prompt: "ping" });

    expect(historyStore.records).toEqual([
      expect.objectContaining({
        type: "text",
        routeId: "kmkapi-text",
        provider: "openai-compatible",
        model: "gpt-5.5",
        status: "success"
      })
    ]);
  });

  test("adds the OpenAI-compatible v1 path when a cc-switch route stores the provider root URL", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      return new Response(JSON.stringify({ output_text: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const config = createConfig();
    config.routes[0]!.baseUrl = "https://www.kamenking.top";
    const router = new CapabilityRouter({
      config,
      fetchImpl,
      env: { KMKAPI_API_KEY: "secret-text" }
    });

    await router.callModel({ prompt: "ping" });

    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://www.kamenking.top/v1/responses");
  });

  test("routes image generation to the default image capability", async () => {
    const dir = await mkdtemp(join(tmpdir(), "capability-router-output-"));
    const fetchImpl = vi.fn<FetchLike>(async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              b64_json:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jUN9AAAAAABJRU5ErkJggg=="
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const config = createConfig(dir);
    const router = new CapabilityRouter({
      config,
      fetchImpl,
      env: { KMKAPI_IMAGE_API_KEY: "secret-image" }
    });

    const result = await router.generateImage({
      prompt: "生成一张参考图",
      size: "1536x864"
    });

    expect(result.routeId).toBe("kmkapi-image");
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://www.kamenking.top/v1/images/generations");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "gpt-image-test",
      prompt: "生成一张参考图",
      size: "1536x864",
      n: 1
    });
    await expect(readFile(result.imagePath)).resolves.toHaveLength(70);
  });

  test("includes endpoint and network cause when a text route cannot be reached", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      const error = new TypeError("fetch failed");
      (error as Error & { cause?: Error & { code?: string } }).cause = Object.assign(
        new Error("read ECONNRESET"),
        { code: "ECONNRESET" }
      );
      throw error;
    });
    const historyStore = createMemoryHistoryStore();
    const router = new CapabilityRouter({
      config: createConfig(),
      fetchImpl,
      env: { KMKAPI_API_KEY: "secret-text" },
      historyStore
    });

    await expect(router.callModel({ prompt: "ping" })).rejects.toThrow(
      /文本能力请求未能连接到 https:\/\/www\.kamenking\.top\/v1\/responses：TypeError: fetch failed；原因 ECONNRESET: read ECONNRESET/
    );
    expect(historyStore.records[0]).toMatchObject({
      type: "text",
      routeId: "kmkapi-text",
      status: "error"
    });
    expect(historyStore.records[0]?.summary).toContain("ECONNRESET");
    expect(historyStore.records[0]?.summary).not.toContain("secret-text");
  });
});

function createConfig(outputDir = "outputs/images"): RouterConfig {
  return {
    activeRouteId: "kmkapi-text",
    defaultRoutes: {
      text: "kmkapi-text",
      image: "kmkapi-image"
    },
    routes: [
      {
        id: "kmkapi-text",
        name: "KMKAPI",
        provider: "openai-compatible",
        capabilities: ["text"],
        baseUrl: "https://www.kamenking.top/v1",
        model: "gpt-5.5",
        secretSource: "env",
        secretEnvVar: "KMKAPI_API_KEY",
        ccswitchProviderId: "",
        outputDir,
        allowConversationContext: true
      },
      {
        id: "kmkapi-image",
        name: "KMKAPI-IMAGE",
        provider: "openai-compatible",
        capabilities: ["image"],
        baseUrl: "https://www.kamenking.top/v1",
        model: "gpt-image-test",
        secretSource: "env",
        secretEnvVar: "KMKAPI_IMAGE_API_KEY",
        ccswitchProviderId: "",
        outputDir,
        allowConversationContext: false
      }
    ],
    activeProfileId: "kmkapi-image",
    profiles: []
  };
}

function createMemoryHistoryStore(): Pick<HistoryStore, "append"> & {
  records: Awaited<ReturnType<HistoryStore["read"]>>;
} {
  const records: Awaited<ReturnType<HistoryStore["read"]>> = [];
  return {
    records,
    async append(record) {
      records.unshift(record);
      return records;
    }
  };
}

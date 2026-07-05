import { mockPngBuffer, writeImageResult } from "./output.js";
import type {
  CallModelRequest,
  CallModelResult,
  FetchLike,
  GenerateImageRequest,
  GenerateImageResult
} from "./types.js";
import type { CapabilityRoute, ProviderKind } from "../config/schema.js";

export async function generateWithMockProvider(
  route: ImageProviderRoute,
  request: GenerateImageRequest
): Promise<GenerateImageResult> {
  return writeImageResult({
    image: mockPngBuffer(),
    profile: route,
    request,
    provider: "mock"
  });
}

export async function callWithMockProvider(
  route: CapabilityRoute,
  request: CallModelRequest
): Promise<CallModelResult> {
  return {
    id: `${new Date().toISOString().replace(/[:.]/g, "-")}-mock-text`,
    routeId: route.id,
    provider: "mock",
    model: route.model,
    text: `模拟模型回复：${request.prompt}`,
    createdAt: new Date().toISOString()
  };
}

export async function generateWithOpenAiCompatibleProvider(args: {
  route: ImageProviderRoute;
  request: GenerateImageRequest;
  fetchImpl: FetchLike;
  secret: string;
}): Promise<GenerateImageResult> {
  const endpoint = `${openAiCompatibleBaseUrl(args.route.baseUrl)}/images/generations`;
  const response = await fetchOrThrow("图片", endpoint, args.fetchImpl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: args.route.model,
      prompt: buildPrompt(args.route, args.request),
      size: args.request.size ?? "1024x1024",
      n: 1
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`图片能力请求失败，状态码 ${response.status}：${redactSecret(body, args.secret)}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const first = payload.data?.[0];
  if (!first?.b64_json) {
    throw new Error("图片能力没有返回 data[0].b64_json");
  }

  return writeImageResult({
    image: Buffer.from(first.b64_json, "base64"),
    profile: args.route,
    request: args.request,
    provider: "openai-compatible"
  });
}

export async function callOpenAiCompatibleModel(args: {
  route: CapabilityRoute;
  request: CallModelRequest;
  fetchImpl: FetchLike;
  secret: string;
}): Promise<CallModelResult> {
  const endpoint = `${openAiCompatibleBaseUrl(args.route.baseUrl)}/responses`;
  const response = await fetchOrThrow("文本", endpoint, args.fetchImpl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: args.route.model,
      input: buildPrompt(args.route, args.request)
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`文本能力请求失败，状态码 ${response.status}：${redactSecret(body, args.secret)}`);
  }

  const payload = await response.json();
  return {
    id: `${new Date().toISOString().replace(/[:.]/g, "-")}-model-call`,
    routeId: args.route.id,
    provider: args.route.provider,
    model: args.route.model,
    text: extractText(payload),
    createdAt: new Date().toISOString()
  };
}

type ImageProviderRoute = Pick<
  CapabilityRoute,
  | "id"
  | "provider"
  | "baseUrl"
  | "model"
  | "outputDir"
  | "allowConversationContext"
> & { provider: ProviderKind };

function buildPrompt(
  route: Pick<CapabilityRoute, "allowConversationContext">,
  request: Pick<GenerateImageRequest | CallModelRequest, "prompt" | "conversationContext">
): string {
  if (!route.allowConversationContext || !request.conversationContext) {
    return request.prompt;
  }
  return `${request.prompt}\n\n对话上下文：\n${request.conversationContext}`;
}

function extractText(payload: unknown): string {
  if (isRecord(payload) && typeof payload.output_text === "string") {
    return payload.output_text;
  }
  if (isRecord(payload) && Array.isArray(payload.output)) {
    const parts: string[] = [];
    for (const item of payload.output) {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        continue;
      }
      for (const content of item.content) {
        if (isRecord(content) && typeof content.text === "string") {
          parts.push(content.text);
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n");
    }
  }
  return JSON.stringify(payload);
}

function openAiCompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

async function fetchOrThrow(
  capabilityLabel: string,
  endpoint: string,
  fetchImpl: FetchLike,
  init: RequestInit
): Promise<Response> {
  try {
    return await fetchImpl(endpoint, init);
  } catch (error) {
    throw new Error(`${capabilityLabel}能力请求未能连接到 ${endpoint}：${formatFetchError(error)}`);
  }
}

function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = getErrorCause(error);
  const causeText = cause
    ? `；原因 ${cause.code ? `${cause.code}: ` : ""}${cause.message}`
    : "";
  return `${error.name}: ${error.message}${causeText}`;
}

function getErrorCause(error: Error): { code?: string; message: string } | undefined {
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = typeof (cause as Error & { code?: unknown }).code === "string"
      ? (cause as Error & { code: string }).code
      : undefined;
    return { code, message: cause.message };
  }
  return undefined;
}

function redactSecret(body: string, secret: string): string {
  return secret ? body.split(secret).join("[redacted]") : body;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

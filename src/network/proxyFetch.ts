import { spawn } from "node:child_process";
import { URL } from "node:url";
import { fetch as undiciFetch, ProxyAgent } from "undici";

import type { FetchLike } from "../router/types.js";

type ProxyAwareFetchOptions = {
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
  directFetch?: FetchLike;
  proxiedFetch?: ProxiedFetch;
  readWindowsProxySettings?: () => Promise<string>;
};

type ResolveProxyOptions = Pick<
  ProxyAwareFetchOptions,
  "env" | "platform" | "readWindowsProxySettings"
>;

type ProxiedFetch = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  proxyUrl: string
) => Promise<Response>;

export function createProxyAwareFetch(options: ProxyAwareFetchOptions = {}): FetchLike {
  const directFetch = options.directFetch ?? fetch;
  const proxiedFetch = options.proxiedFetch ?? fetchViaHttpProxy;

  return async (input, init) => {
    const targetUrl = toUrl(input);
    const proxyUrl = await resolveProxyForUrl(targetUrl, options);
    if (!proxyUrl) {
      return directFetch(input, init);
    }
    return proxiedFetch(input, init, proxyUrl);
  };
}

export async function resolveProxyForUrl(
  targetUrl: URL,
  options: ResolveProxyOptions = {}
): Promise<string | undefined> {
  const env = options.env ?? process.env;
  const envProxy = proxyFromEnv(targetUrl, env);
  if (envProxy) {
    return envProxy;
  }

  const platform = options.platform ?? process.platform;
  if (platform !== "win32") {
    return undefined;
  }

  const readWindowsProxySettings = options.readWindowsProxySettings ?? queryWindowsProxySettings;
  const output = await readWindowsProxySettings().catch(() => "");
  return parseWindowsProxyServer(output, targetUrl.protocol);
}

export function parseWindowsProxyServer(
  registryOutput: string,
  protocol: string
): string | undefined {
  if (!/\bProxyEnable\b[\s\S]*?\b0x1\b/i.test(registryOutput)) {
    return undefined;
  }

  const proxyServer = registryOutput.match(/\bProxyServer\b\s+REG_SZ\s+([^\r\n]+)/i)?.[1]?.trim();
  if (!proxyServer) {
    return undefined;
  }

  const protocolName = protocol.replace(/:$/, "").toLowerCase();
  const proxyValue =
    proxyServer
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.toLowerCase().startsWith(`${protocolName}=`))
      ?.split("=")
      .slice(1)
      .join("=")
      .trim() ?? (proxyServer.includes("=") ? undefined : proxyServer);

  return proxyValue ? normalizeProxyUrl(proxyValue) : undefined;
}

async function fetchViaHttpProxy(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  proxyUrl: string
): Promise<Response> {
  const dispatcher = new ProxyAgent(proxyUrl);
  const request = new Request(input, init);
  const body = init?.body ?? request.body;
  const undiciInit = {
    method: request.method,
    headers: request.headers,
    body,
    dispatcher,
    ...(body ? { duplex: "half" } : {})
  } as unknown as Parameters<typeof undiciFetch>[1];
  const response = await undiciFetch(request.url, {
    ...undiciInit
  });
  return new Response(response.body as unknown as BodyInit, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as unknown as HeadersInit
  });
}

function toUrl(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }
  if (input instanceof Request) {
    return new URL(input.url);
  }
  return new URL(input);
}

function proxyFromEnv(
  targetUrl: URL,
  env: Record<string, string | undefined>
): string | undefined {
  if (matchesNoProxy(targetUrl.hostname, env.NO_PROXY ?? env.no_proxy)) {
    return undefined;
  }

  const raw =
    targetUrl.protocol === "https:"
      ? env.HTTPS_PROXY ?? env.https_proxy ?? env.ALL_PROXY ?? env.all_proxy
      : env.HTTP_PROXY ?? env.http_proxy ?? env.ALL_PROXY ?? env.all_proxy;
  return raw ? normalizeProxyUrl(raw) : undefined;
}

function normalizeProxyUrl(value: string): string {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

function matchesNoProxy(hostname: string, noProxy?: string): boolean {
  if (!noProxy) {
    return false;
  }
  const normalizedHost = hostname.toLowerCase();
  return noProxy
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => {
      if (!part) {
        return false;
      }
      if (part === "*") {
        return true;
      }
      if (part.startsWith(".")) {
        return normalizedHost.endsWith(part);
      }
      return normalizedHost === part || normalizedHost.endsWith(`.${part}`);
    });
}

function queryWindowsProxySettings(): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "reg",
      [
        "query",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
      ],
      { windowsHide: true }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 || stdout) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `reg query exited with ${code}`));
      }
    });
  });
}

import { describe, expect, test, vi } from "vitest";

import {
  createProxyAwareFetch,
  parseWindowsProxyServer,
  resolveProxyForUrl
} from "../src/network/proxyFetch.js";
import type { FetchLike } from "../src/router/types.js";

describe("proxy-aware fetch", () => {
  test("sends JSON POST bodies through the proxied fetch path without requiring callers to set duplex", async () => {
    const fetchImpl = createProxyAwareFetch({
      env: { HTTPS_PROXY: "http://127.0.0.1:9" },
      platform: "linux"
    });

    await expect(
      fetchImpl("https://www.kamenking.top/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "test", input: "ping" })
      })
    ).rejects.not.toThrow(/duplex option is required/);
  });

  test("uses HTTPS_PROXY for https requests", async () => {
    const directFetch = vi.fn<FetchLike>();
    const proxiedFetch = vi.fn(async (_input, _init, proxyUrl: string) => {
      return new Response(proxyUrl);
    });
    const fetchImpl = createProxyAwareFetch({
      env: { HTTPS_PROXY: "http://127.0.0.1:7890" },
      platform: "linux",
      directFetch,
      proxiedFetch
    });

    const response = await fetchImpl("https://www.kamenking.top");

    await expect(response.text()).resolves.toBe("http://127.0.0.1:7890");
    expect(proxiedFetch).toHaveBeenCalledOnce();
    expect(directFetch).not.toHaveBeenCalled();
  });

  test("keeps direct fetch when no proxy is configured", async () => {
    const directFetch = vi.fn<FetchLike>(async () => new Response("direct"));
    const proxiedFetch = vi.fn();
    const fetchImpl = createProxyAwareFetch({
      env: {},
      platform: "linux",
      directFetch,
      proxiedFetch
    });

    const response = await fetchImpl("https://www.kamenking.top");

    await expect(response.text()).resolves.toBe("direct");
    expect(directFetch).toHaveBeenCalledOnce();
    expect(proxiedFetch).not.toHaveBeenCalled();
  });

  test("parses the enabled Windows user proxy from registry output", () => {
    const output = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ       127.0.0.1:7890
`;

    expect(parseWindowsProxyServer(output, "https:")).toBe("http://127.0.0.1:7890");
  });

  test("parses Windows proxy when registry output contains unrelated values", () => {
    const output = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    AutoConfigProxy    REG_SZ       wininet.dll
    ProxyEnable        REG_DWORD    0x1
    EnableHttp1_1      REG_DWORD    0x1
    ProxyServer        REG_SZ       127.0.0.1:7890
    ProxyOverride      REG_SZ       <-loopback>
`;

    expect(parseWindowsProxyServer(output, "https:")).toBe("http://127.0.0.1:7890");
  });

  test("prefers the protocol-specific Windows proxy entry", () => {
    const output = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ       http=127.0.0.1:7890;https=127.0.0.1:7891
`;

    expect(parseWindowsProxyServer(output, "https:")).toBe("http://127.0.0.1:7891");
  });

  test("ignores disabled Windows user proxy settings", () => {
    const output = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x0
    ProxyServer    REG_SZ       127.0.0.1:7890
`;

    expect(parseWindowsProxyServer(output, "https:")).toBeUndefined();
  });

  test("resolves Windows proxy when env proxy is absent", async () => {
    const proxy = await resolveProxyForUrl(new URL("https://www.kamenking.top"), {
      env: {},
      platform: "win32",
      readWindowsProxySettings: async () => `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings
    ProxyEnable    REG_DWORD    0x1
    ProxyServer    REG_SZ       127.0.0.1:7890
`
    });

    expect(proxy).toBe("http://127.0.0.1:7890");
  });
});

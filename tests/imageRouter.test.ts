import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

import { ImageRouter } from "../src/router/imageRouter.js";
import type { FetchLike } from "../src/router/types.js";
import type { RouterConfig } from "../src/config/schema.js";

describe("ImageRouter", () => {
  test("mock provider writes a local PNG and metadata without requiring a secret", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-output-"));
    const config: RouterConfig = {
      activeProfileId: "mock",
      profiles: [
        {
          id: "mock",
          name: "Mock",
          provider: "mock",
          baseUrl: "",
          model: "mock-image",
          secretEnvVar: "",
          outputDir: dir,
          allowConversationContext: false
        }
      ]
    };
    const router = new ImageRouter({ config });

    const result = await router.generate({
      prompt: "a calm product dashboard",
      size: "1024x1024"
    });

    expect(result.provider).toBe("mock");
    expect(result.model).toBe("mock-image");
    expect(result.imagePath).toMatch(/\.png$/);
    expect(result.metadataPath).toMatch(/\.json$/);
    const image = await readFile(result.imagePath);
    expect(image).toHaveLength(70);
    expect(image.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    await expect(readFile(result.metadataPath, "utf8")).resolves.toContain(
      "a calm product dashboard"
    );
  });

  test("openai-compatible provider sends bearer token from env and saves returned base64 image", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-output-"));
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
    const config: RouterConfig = {
      activeProfileId: "kmkapi",
      profiles: [
        {
          id: "kmkapi",
          name: "KMKAPI",
          provider: "openai-compatible",
          baseUrl: "https://www.kamenking.top/v1",
          model: "kmk-image-model",
          secretEnvVar: "KMKAPI_IMAGE_API_KEY",
          outputDir: dir,
          allowConversationContext: false
        }
      ]
    };
    const router = new ImageRouter({
      config,
      fetchImpl,
      env: { KMKAPI_IMAGE_API_KEY: "secret-value" }
    });

    const result = await router.generate({
      prompt: "section reference image",
      size: "1536x864"
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://www.kamenking.top/v1/images/generations");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer secret-value",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "kmk-image-model",
      prompt: "section reference image",
      size: "1536x864",
      n: 1
    });
    await expect(readFile(result.imagePath)).resolves.toHaveLength(70);
  });

  test("openai-compatible provider fails clearly when secret env var is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "codex-image-router-output-"));
    const config: RouterConfig = {
      activeProfileId: "kmkapi",
      profiles: [
        {
          id: "kmkapi",
          name: "KMKAPI",
          provider: "openai-compatible",
          baseUrl: "https://www.kamenking.top/v1",
          model: "kmk-image-model",
          secretEnvVar: "KMKAPI_IMAGE_API_KEY",
          outputDir: dir,
          allowConversationContext: false
        }
      ]
    };
    const router = new ImageRouter({ config, env: {} });

    await expect(router.generate({ prompt: "missing key" })).rejects.toThrow(
      /KMKAPI_IMAGE_API_KEY/
    );
  });
});

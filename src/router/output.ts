import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { GenerateImageRequest, GenerateImageResult } from "./types.js";
import type { CapabilityRoute, ProviderKind, ProviderProfile } from "../config/schema.js";

const ONE_BY_ONE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jUN9AAAAAABJRU5ErkJggg==",
  "base64"
);

export function mockPngBuffer(): Buffer {
  return ONE_BY_ONE_PNG;
}

export async function writeImageResult(args: {
  image: Buffer;
  profile: ImageOutputProfile;
  request: GenerateImageRequest;
  provider: ProviderKind;
}): Promise<GenerateImageResult> {
  await mkdir(args.profile.outputDir, { recursive: true });
  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/[:.]/g, "-")}-${safeSlug(args.request.prompt)}`;
  const imagePath = join(args.profile.outputDir, `${id}.png`);
  const metadataPath = join(args.profile.outputDir, `${id}.json`);
  const result: GenerateImageResult = {
    id,
    provider: args.provider,
    profileId: args.profile.id,
    routeId: args.profile.id,
    model: args.profile.model,
    prompt: args.request.prompt,
    imagePath,
    metadataPath,
    createdAt
  };

  await writeFile(imagePath, args.image);
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        ...result,
        size: args.request.size ?? "1024x1024",
        conversationContextIncluded: Boolean(
          args.profile.allowConversationContext && args.request.conversationContext
        )
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return result;
}

type ImageOutputProfile = Pick<
  ProviderProfile | CapabilityRoute,
  "id" | "model" | "outputDir" | "allowConversationContext"
>;

function safeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "image";
}

import type { Capability, ProviderKind } from "../config/schema.js";

export type GenerateImageRequest = {
  prompt: string;
  size?: string;
  profileId?: string;
  routeId?: string;
  conversationContext?: string;
};

export type GenerateImageResult = {
  id: string;
  provider: ProviderKind;
  profileId: string;
  routeId: string;
  model: string;
  prompt: string;
  imagePath: string;
  metadataPath: string;
  createdAt: string;
};

export type CallModelRequest = {
  prompt: string;
  capability?: Capability;
  routeId?: string;
  conversationContext?: string;
};

export type CallModelResult = {
  id: string;
  routeId: string;
  provider: ProviderKind;
  model: string;
  text: string;
  createdAt: string;
};

export type FetchLike = typeof fetch;

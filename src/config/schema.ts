import { z } from "zod";

export const providerKindSchema = z.enum(["mock", "openai-compatible"]);
export const capabilitySchema = z.enum(["text", "image", "vision", "code", "other"]);
export const secretSourceSchema = z.enum(["env", "cc-switch"]);

export const providerProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: providerKindSchema,
  baseUrl: z.string(),
  model: z.string().min(1),
  secretEnvVar: z.string(),
  outputDir: z.string().min(1),
  allowConversationContext: z.boolean()
});

export const capabilityRouteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: providerKindSchema,
  capabilities: z.array(capabilitySchema).min(1, "能力路由至少需要包含一个能力"),
  baseUrl: z.string(),
  model: z.string().min(1),
  secretSource: secretSourceSchema,
  secretEnvVar: z.string(),
  ccswitchProviderId: z.string(),
  outputDir: z.string().min(1),
  allowConversationContext: z.boolean()
});

export const defaultRoutesSchema = z
  .object({
    text: z.string().optional(),
    image: z.string().optional(),
    vision: z.string().optional(),
    code: z.string().optional(),
    other: z.string().optional()
  })
  .default({});

const routerConfigObjectSchema = z
  .object({
    activeRouteId: z.string().min(1),
    defaultRoutes: defaultRoutesSchema,
    routes: z.array(capabilityRouteSchema).min(1, "配置至少需要包含一个能力路由"),
    activeProfileId: z.string().min(1),
    profiles: z.array(providerProfileSchema)
  })
  .refine((value) => value.routes.some((route) => route.id === value.activeRouteId), {
    message: "activeRouteId 必须匹配一个已存在的能力路由",
    path: ["activeRouteId"]
  })
  .refine(
    (value) =>
      Object.values(value.defaultRoutes).every(
        (routeId) => !routeId || value.routes.some((route) => route.id === routeId)
      ),
    {
      message: "defaultRoutes 必须匹配已存在的能力路由",
      path: ["defaultRoutes"]
    }
  );

export const routerConfigSchema = z.preprocess(migrateRouterConfigShape, routerConfigObjectSchema);

export type Capability = z.infer<typeof capabilitySchema>;
export type ProviderKind = z.infer<typeof providerKindSchema>;
export type ProviderProfile = z.infer<typeof providerProfileSchema>;
export type CapabilityRoute = z.infer<typeof capabilityRouteSchema>;
export type SecretSource = z.infer<typeof secretSourceSchema>;
export type RouterConfig = z.infer<typeof routerConfigSchema>;

function migrateRouterConfigShape(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const profiles = Array.isArray(value.profiles)
    ? value.profiles.map((profile) => migrateLegacyProfileName(profile))
    : [];
  const routes = Array.isArray(value.routes)
    ? value.routes
    : profiles.map((profile) => legacyProfileToRoute(profile));

  if (routes.length === 0) {
    return value;
  }

  const activeRouteId =
    typeof value.activeRouteId === "string"
      ? value.activeRouteId
      : typeof value.activeProfileId === "string"
        ? value.activeProfileId
        : routes[0]?.id;

  const activeProfileId =
    typeof value.activeProfileId === "string"
      ? value.activeProfileId
      : typeof activeRouteId === "string"
        ? activeRouteId
        : routes[0]?.id;

  const defaultRoutes = isRecord(value.defaultRoutes)
    ? value.defaultRoutes
    : inferDefaultRoutes(routes, activeRouteId);

  return {
    ...value,
    activeRouteId,
    defaultRoutes,
    routes,
    activeProfileId,
    profiles
  };
}

function legacyProfileToRoute(profile: unknown): unknown {
  if (!isRecord(profile)) {
    return profile;
  }
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    capabilities: ["image"],
    baseUrl: profile.baseUrl,
    model: profile.model,
    secretSource: "env",
    secretEnvVar: profile.secretEnvVar,
    ccswitchProviderId: "",
    outputDir: profile.outputDir,
    allowConversationContext: profile.allowConversationContext
  };
}

function inferDefaultRoutes(routes: unknown[], activeRouteId: unknown): Record<string, string> {
  const typedRoutes = routes.filter(isRecord);
  const imageRoute = typedRoutes.find((route) => hasCapability(route, "image"));
  const textRoute = typedRoutes.find((route) => hasCapability(route, "text"));
  return {
    ...(typeof textRoute?.id === "string" ? { text: textRoute.id } : {}),
    ...(typeof imageRoute?.id === "string"
      ? { image: imageRoute.id }
      : typeof activeRouteId === "string"
        ? { image: activeRouteId }
        : {})
  };
}

function hasCapability(route: Record<string, unknown>, capability: Capability): boolean {
  return Array.isArray(route.capabilities) && route.capabilities.includes(capability);
}

function migrateLegacyProfileName(profile: unknown): unknown {
  if (
    isRecord(profile) &&
    profile.id === "mock-local" &&
    profile.name === "Mock Local" &&
    profile.provider === "mock" &&
    profile.model === "mock-image"
  ) {
    return { ...profile, name: "本地模拟" };
  }
  return profile;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

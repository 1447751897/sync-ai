import { defaultOutputDir } from "../config/defaults.js";
import { routerConfigSchema, type CapabilityRoute, type RouterConfig } from "../config/schema.js";
import { readCcswitchProviders, readCcswitchSecret } from "./pythonReader.js";
import type { CcswitchProvider, CcswitchReadOptions } from "./types.js";

export async function listCcswitchProviders(
  options: CcswitchReadOptions = {}
): Promise<CcswitchProvider[]> {
  return readCcswitchProviders(options);
}

export async function resolveCcswitchSecret(
  providerId: string,
  options: CcswitchReadOptions = {}
): Promise<string> {
  return readCcswitchSecret(providerId, options);
}

export async function syncCcswitchRoutes(
  config: RouterConfig,
  options: CcswitchReadOptions = {}
): Promise<RouterConfig> {
  const parsed = routerConfigSchema.parse(config);
  const providers = (await listCcswitchProviders(options)).filter(
    (provider) => provider.baseUrl && provider.model
  );
  const ccswitchRoutes = providers.map(providerToRoute);
  const nonCcswitchRoutes = parsed.routes.filter((route) => route.secretSource !== "cc-switch");
  const routes = mergeRoutes(nonCcswitchRoutes, ccswitchRoutes);
  const textRoute =
    ccswitchRoutes.find((route) => route.capabilities.includes("text") && route.id.includes(currentCodexId(providers))) ??
    ccswitchRoutes.find((route) => route.capabilities.includes("text"));
  const imageRoute = ccswitchRoutes.find((route) => route.capabilities.includes("image"));
  const defaultRoutes = {
    ...parsed.defaultRoutes,
    ...(textRoute ? { text: textRoute.id } : {}),
    ...(imageRoute ? { image: imageRoute.id } : {})
  };

  return routerConfigSchema.parse({
    ...parsed,
    activeRouteId: textRoute?.id ?? parsed.activeRouteId,
    activeProfileId: imageRoute?.id ?? parsed.activeProfileId,
    defaultRoutes,
    routes
  });
}

function providerToRoute(provider: CcswitchProvider): CapabilityRoute {
  return {
    id: `ccswitch-${safeId(provider.id)}`,
    name: provider.name,
    provider: "openai-compatible",
    capabilities: provider.capabilities,
    baseUrl: provider.baseUrl,
    model: provider.model,
    secretSource: "cc-switch",
    secretEnvVar: "",
    ccswitchProviderId: provider.id,
    outputDir: defaultOutputDir(),
    allowConversationContext: provider.capabilities.includes("text")
  };
}

function mergeRoutes(existing: CapabilityRoute[], imported: CapabilityRoute[]): CapabilityRoute[] {
  const byId = new Map<string, CapabilityRoute>();
  for (const route of existing) {
    byId.set(route.id, route);
  }
  for (const route of imported) {
    byId.set(route.id, route);
  }
  return Array.from(byId.values());
}

function currentCodexId(providers: CcswitchProvider[]): string {
  return safeId(providers.find((provider) => provider.isCurrentCodex)?.id ?? "");
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

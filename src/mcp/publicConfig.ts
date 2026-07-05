import type { RouterConfig } from "../config/schema.js";

export type PublicRouterConfig = Pick<RouterConfig, "activeRouteId" | "defaultRoutes" | "routes">;

export function toPublicConfig(config: RouterConfig): PublicRouterConfig {
  return {
    activeRouteId: config.activeRouteId,
    defaultRoutes: config.defaultRoutes,
    routes: config.routes
  };
}

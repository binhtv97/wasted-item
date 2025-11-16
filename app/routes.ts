import type { RouteConfig } from "@react-router/dev/routes";
import { coreRoutes } from "./route-groups/core";
import { staticRoutes } from "./route-groups/static";
import { apiRoutes } from "./route-groups/api";

export default [
  ...coreRoutes,
  ...staticRoutes,
  ...apiRoutes,
] satisfies RouteConfig;
import type { RouteConfig } from "@react-router/dev/routes";
import { route } from "@react-router/dev/routes";

export const staticRoutes = [
  route("about", "routes/about.tsx"),
  route("login-pin", "routes/login-pin.tsx"),
] satisfies RouteConfig;
import type { RouteConfig } from "@react-router/dev/routes";
import { layout, index, route } from "@react-router/dev/routes";

export const coreRoutes = [
  layout("layouts/sidebar.tsx", [
    index("routes/home.tsx"),
    // Process screen route
    route("process", "routes/process.tsx"),
  ]),
] satisfies RouteConfig;

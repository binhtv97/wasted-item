import type { RouteConfig } from "@react-router/dev/routes";
import { route } from "@react-router/dev/routes";

export const apiRoutes = [
  // Auth routes
  route("api/auth/register", "routes/api/auth/register.ts"),
  route("api/auth/login", "routes/api/auth/login.ts"),
  
  // User routes
  route("api/users/profile", "routes/api/users/profile.ts"),
  
  // Process routes
  route("api/process/entry", "routes/api/process/entry.ts"),
  // Report export
  route("api/reports/export", "routes/api/reports/export.ts"),
  // Save CSV to folder
  route("api/reports/save", "routes/api/reports/save.ts"),
] satisfies RouteConfig;
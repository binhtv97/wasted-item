import type { Route } from "./+types/sidebar";
import { Outlet } from "react-router";

// No sidebar data required

export async function loader({ request }: Route.LoaderArgs) {
  return {};
}

// No sidebar actions

export default function SidebarLayout({}: Route.ComponentProps) {
  return (
    <div id="detail">
      <Outlet />
    </div>
  );
}

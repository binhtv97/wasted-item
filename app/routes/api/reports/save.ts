import type { LoaderFunctionArgs } from "react-router";
import { saveCsvToFolder } from "../../../services/report.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") || "daily").toLowerCase();
  if (!["daily", "weekly", "monthly"].includes(period)) {
    return new Response(JSON.stringify({ error: "Invalid period" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const path = await saveCsvToFolder(period as any, "csv");
  return new Response(JSON.stringify({ path }), {
    headers: { "Content-Type": "application/json" },
  });
}
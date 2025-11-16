import type { LoaderFunctionArgs } from "react-router";
import { generateCsv } from "../../../services/report.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const period = (url.searchParams.get("period") || "daily").toLowerCase();
  if (!["daily", "weekly", "monthly"].includes(period)) {
    return new Response(JSON.stringify({ error: "Invalid period" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { filename, csv } = await generateCsv(period as any);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
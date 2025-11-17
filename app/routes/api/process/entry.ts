import type { ActionFunctionArgs } from "react-router";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const form = await request.formData();
    const itemId = Number(form.get("itemId"));
    const delta = Number(form.get("delta")); // +1 or -1

    if (!itemId || ![1, -1].includes(delta)) {
      return new Response(
        JSON.stringify({ error: "Invalid itemId or delta" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const item = await prisma.wasteItem.findUnique({
      where: { id: itemId },
      select: { id: true, unit: true },
    });
    if (!item) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const outlet = await prisma.outlet.findFirst({ select: { id: true } });
    if (!outlet) {
      return new Response(JSON.stringify({ error: "Outlet not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Reason has been removed; entries no longer require reasonId

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const agg = await prisma.wasteEntry.aggregate({
      where: { itemId: item.id, recordedAt: { gte: start, lte: end } },
      _sum: { quantity: true },
    });
    const current =
      typeof agg._sum.quantity === "object"
        ? Number(agg._sum.quantity as any)
        : Number(agg._sum.quantity ?? 0);

    if (delta === -1 && current <= 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, total: current }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const entry = await prisma.wasteEntry.create({
      data: {
        outletId: outlet.id,
        itemId: item.id,
        quantity: delta,
        unit: item.unit,
      },
      select: { id: true, itemId: true, quantity: true, recordedAt: true },
    });

    return new Response(JSON.stringify({ success: true, entry }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Process entry error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

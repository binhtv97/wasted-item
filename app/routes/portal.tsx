import type { Route } from "./+types/portal";
import { PrismaClient } from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import { Form, useActionData } from "react-router";

const prisma = new PrismaClient();

export async function loader({}: Route.LoaderArgs) {
  const outlets = await prisma.outlet.findMany({ select: { id: true, outletCode: true, name: true, timezone: true, closingTime: true } });
  const recipients = await prisma.reportRecipient.findMany({ orderBy: { id: "asc" }, select: { id: true, email: true, reportType: true, sendTimeMin: true, isActive: true } });
  const items = await prisma.wasteItem.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, itemCode: true, label: true, unit: true, icon: true, color: true, displayOrder: true, isActive: true } });
  return { outlets, recipients, items };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const model = String(form.get("model"));
  const intent = String(form.get("intent"));
  if (model === "outlet" && intent === "update") {
    const id = Number(form.get("id"));
    const closingTime = String(form.get("closingTime") || "").trim() || null;
    await prisma.outlet.update({ where: { id }, data: { closingTime } });
    return new Response(JSON.stringify({ ok: true, message: "Outlet updated" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (model === "recipient") {
    if (intent === "create") {
      const email = String(form.get("email"));
      const reportType = String(form.get("reportType"));
      const sendTimeMin = Number(form.get("sendTimeMin") || 0);
      const isActive = String(form.get("isActive")) === "on";
      await prisma.reportRecipient.create({ data: { email, reportType: reportType as any, sendTimeMin, isActive } });
      return new Response(JSON.stringify({ ok: true, message: "Recipient added" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (intent === "update") {
      const id = Number(form.get("id"));
      const email = String(form.get("email"));
      const reportType = String(form.get("reportType"));
      const sendTimeMin = Number(form.get("sendTimeMin") || 0);
      const isActive = String(form.get("isActive")) === "on";
      await prisma.reportRecipient.update({ where: { id }, data: { email, reportType: reportType as any, sendTimeMin, isActive } });
      return new Response(JSON.stringify({ ok: true, message: "Recipient updated" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (intent === "delete") {
      const id = Number(form.get("id"));
      await prisma.reportRecipient.delete({ where: { id } });
      return new Response(JSON.stringify({ ok: true, message: "Recipient deleted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  if (model === "item") {
    if (intent === "create") {
      const itemCode = String(form.get("itemCode"));
      const label = String(form.get("label"));
      const unit = String(form.get("unit"));
      const icon = String(form.get("icon") || "");
      const color = String(form.get("color") || "#FF6B35");
      const displayOrder = Number(form.get("displayOrder") || 0);
      const isActive = String(form.get("isActive")) === "on";
      await prisma.wasteItem.create({ data: { itemCode, label, unit, icon, color, displayOrder, isActive } });
      return new Response(JSON.stringify({ ok: true, message: "Item added" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (intent === "update") {
      const id = Number(form.get("id"));
      const label = String(form.get("label"));
      const unit = String(form.get("unit"));
      const icon = String(form.get("icon") || "");
      const color = String(form.get("color") || "#FF6B35");
      const displayOrder = Number(form.get("displayOrder") || 0);
      const isActive = String(form.get("isActive")) === "on";
      await prisma.wasteItem.update({ where: { id }, data: { label, unit, icon, color, displayOrder, isActive } });
      return new Response(JSON.stringify({ ok: true, message: "Item updated" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (intent === "delete") {
      const id = Number(form.get("id"));
      await prisma.wasteItem.delete({ where: { id } });
      return new Response(JSON.stringify({ ok: true, message: "Item deleted" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  // WasteReason removed
  return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
}

export default function Portal({ loaderData }: Route.ComponentProps) {
  const { outlets, recipients, items } = loaderData as any;
  const [tab, setTab] = useState<string>("outlet");
  const [toast, setToast] = useState<string>("");
  const timerRef = useRef<number | null>(null);
  const actionData = useActionData() as any;
  useEffect(() => {
    if (actionData && actionData.ok && actionData.message) {
      setToast(actionData.message);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setToast(""), 3000);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [actionData]);
  return (
    <div className="min-h-screen w-full p-4">
      <div className="max-w-6xl mx-auto">
        {toast && (
          <div className="mb-3 px-4 py-2 rounded bg-green-600 text-white">{toast}</div>
        )}
        <div className="flex gap-2 mb-4">
          {["outlet", "recipients", "items"].map((t) => (
            <button key={t} className={`px-3 py-2 rounded ${tab === t ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        {tab === "outlet" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Outlet</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Code</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Timezone</th>
                  <th className="p-2">Closing Time</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((o: any) => (
                  <tr key={o.id} className="border-t">
                    <td className="p-2">{o.outletCode}</td>
                    <td className="p-2">{o.name}</td>
                    <td className="p-2">{o.timezone}</td>
                    <td className="p-2">
                      <Form method="post" className="flex gap-2 items-center">
                        <input type="hidden" name="model" value="outlet" />
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={o.id} />
                        <input name="closingTime" defaultValue={o.closingTime || ""} placeholder="HH:MM" className="border rounded px-2 py-1 w-24" />
                        <button className="px-2 py-1 rounded bg-blue-600 text-white">Save</button>
                      </Form>
                    </td>
                    <td className="p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "recipients" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Report Recipients</h2>
            <Form method="post" className="flex flex-wrap gap-2">
              <input type="hidden" name="model" value="recipient" />
              <input type="hidden" name="intent" value="create" />
              <input name="email" placeholder="email" className="border rounded px-2 py-1" />
              <select name="reportType" className="border rounded px-2 py-1">
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
              <input name="sendTimeMin" type="number" min={0} max={1439} placeholder="minutes" className="border rounded px-2 py-1 w-28" />
              <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
              <button className="px-3 py-1 rounded bg-green-600 text-white">Add</button>
            </Form>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Email</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Send Minutes</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      <Form method="post" className="flex gap-2 items-center">
                        <input type="hidden" name="model" value="recipient" />
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={r.id} />
                        <input name="email" defaultValue={r.email} className="border rounded px-2 py-1" />
                        <select name="reportType" defaultValue={r.reportType} className="border rounded px-2 py-1">
                          <option value="DAILY">DAILY</option>
                          <option value="WEEKLY">WEEKLY</option>
                          <option value="MONTHLY">MONTHLY</option>
                        </select>
                        <input name="sendTimeMin" type="number" defaultValue={r.sendTimeMin} className="border rounded px-2 py-1 w-24" />
                        <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked={r.isActive} /> Active</label>
                        <button className="px-2 py-1 rounded bg-blue-600 text-white">Save</button>
                      </Form>
                    </td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <Form method="post">
                        <input type="hidden" name="model" value="recipient" />
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={r.id} />
                        <button className="px-2 py-1 rounded bg-red-600 text-white">Delete</button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "items" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Waste Items</h2>
            <Form method="post" className="flex flex-wrap gap-2">
              <input type="hidden" name="model" value="item" />
              <input type="hidden" name="intent" value="create" />
              <input name="itemCode" placeholder="code" className="border rounded px-2 py-1 w-28" />
              <input name="label" placeholder="label" className="border rounded px-2 py-1" />
              <input name="unit" placeholder="unit" className="border rounded px-2 py-1 w-24" />
              <input name="icon" placeholder="icon" className="border rounded px-2 py-1 w-24" />
              <input name="color" placeholder="#hex" className="border rounded px-2 py-1 w-28" />
              <input name="displayOrder" type="number" placeholder="order" className="border rounded px-2 py-1 w-24" />
              <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
              <button className="px-3 py-1 rounded bg-green-600 text-white">Add</button>
            </Form>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Code</th>
                  <th className="p-2">Label</th>
                  <th className="p-2">Unit</th>
                  <th className="p-2">Icon</th>
                  <th className="p-2">Color</th>
                  <th className="p-2">Order</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-2">{it.itemCode}</td>
                    <td className="p-2">
                      <Form method="post" className="flex flex-wrap gap-2 items-center">
                        <input type="hidden" name="model" value="item" />
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={it.id} />
                        <input name="label" defaultValue={it.label} className="border rounded px-2 py-1" />
                        <input name="unit" defaultValue={it.unit} className="border rounded px-2 py-1 w-24" />
                        <input name="icon" defaultValue={it.icon || ""} className="border rounded px-2 py-1 w-24" />
                        <input name="color" defaultValue={it.color} className="border rounded px-2 py-1 w-28" />
                        <input name="displayOrder" type="number" defaultValue={it.displayOrder} className="border rounded px-2 py-1 w-24" />
                        <label className="flex items-center gap-1"><input type="checkbox" name="isActive" defaultChecked={it.isActive} /> Active</label>
                        <button className="px-2 py-1 rounded bg-blue-600 text-white">Save</button>
                      </Form>
                    </td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2"></td>
                    <td className="p-2">
                      <Form method="post">
                        <input type="hidden" name="model" value="item" />
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={it.id} />
                        <button className="px-2 py-1 rounded bg-red-600 text-white">Delete</button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

export type Period = "daily" | "weekly" | "monthly";

function getSettingsDefaults() {
  return { timezone: "UTC", utcOffsetMinutes: 0, cutOffHour: 0 };
}

export async function getSettings() {
  try {
    const o = await prisma.outlet.findFirst({ where: { isActive: true }, orderBy: { id: "asc" }, select: { timezone: true } });
    const tz = String(o?.timezone || "UTC").trim();
    const m1 = tz.match(/^(UTC|GMT)([+-]\d{1,2})(?::(\d{2}))?$/i);
    if (m1) {
      const offset = Number(m1[2]) * 60 + Number(m1[3] || 0);
      return { timezone: tz, utcOffsetMinutes: offset, cutOffHour: 0 };
    }
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset", hour12: false });
    const name = fmt.formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || "UTC";
    const m2 = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
    const offset = m2 ? Number(m2[1]) * 60 + Number(m2[2] || 0) : 0;
    return { timezone: tz, utcOffsetMinutes: offset, cutOffHour: 0 };
  } catch {
    return getSettingsDefaults();
  }
}

export function getPeriodRange(
  period: Period,
  settings: { utcOffsetMinutes: number }
) {
  const offset = settings.utcOffsetMinutes;
  const nowUTC = new Date();
  const nowLocalMs = nowUTC.getTime() + offset * 60_000;
  const nowLocal = new Date(nowLocalMs);
  const startLocal = new Date(nowLocal);
  startLocal.setMinutes(0, 0, 0);

  const addDays = (d: number, date: Date) => {
    const n = new Date(date);
    n.setDate(n.getDate() + d);
    return n;
  };

  if (period === "daily") {
    startLocal.setFullYear(
      nowLocal.getFullYear(),
      nowLocal.getMonth(),
      nowLocal.getDate()
    );
    startLocal.setHours(0);
    const endLocal = addDays(1, startLocal);
    return {
      startUTC: new Date(startLocal.getTime() - offset * 60_000),
      endUTC: new Date(endLocal.getTime() - offset * 60_000),
    };
  }

  if (period === "weekly") {
    // Week starts Monday 00:00 local
    const day = nowLocal.getDay(); // 0 Sun ... 6 Sat
    const daysSinceMonday = (day + 6) % 7;
    const monday = addDays(-daysSinceMonday, nowLocal);
    startLocal.setFullYear(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate()
    );
    startLocal.setHours(0);
    const endLocal = addDays(7, startLocal);
    return {
      startUTC: new Date(startLocal.getTime() - offset * 60_000),
      endUTC: new Date(endLocal.getTime() - offset * 60_000),
    };
  }

  // monthly: start at day 1 00:00 local
  const first = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1);
  startLocal.setFullYear(
    first.getFullYear(),
    first.getMonth(),
    first.getDate()
  );
  startLocal.setHours(0);
  const nextMonth = new Date(
    startLocal.getFullYear(),
    startLocal.getMonth() + 1,
    startLocal.getDate()
  );
  return {
    startUTC: new Date(startLocal.getTime() - offset * 60_000),
    endUTC: new Date(nextMonth.getTime() - offset * 60_000),
  };
}

export async function generateCsv(period: Period) {
  const settings = await getSettings();
  const { startUTC, endUTC } = getPeriodRange(period, settings);

  const entries = await prisma.wasteEntry.findMany({
    where: { recordedAt: { gte: startUTC, lt: endUTC } },
    orderBy: { recordedAt: "asc" },
    select: {
      quantity: true,
      unit: true,
      outlet: { select: { outletCode: true } },
      item: { select: { itemCode: true, label: true, color: true } },
    },
  });

  const totals = new Map<string, { outlet: string; itemCode: string; itemLabel: string; unit: string; color: string; total: number }>();
  for (const e of entries) {
    const key = `${e.outlet.outletCode}|${e.item.itemCode}|${e.unit}`;
    const qty = typeof e.quantity === "object" ? Number(e.quantity as any) : Number(e.quantity);
    const prev = totals.get(key);
    if (prev) prev.total += qty;
    else totals.set(key, { outlet: e.outlet.outletCode, itemCode: e.item.itemCode, itemLabel: e.item.label, unit: e.unit, color: e.item.color, total: qty });
  }
  const header = ["outlet", "item_code", "item_label", "unit", "total", "color"];
  const rows = Array.from(totals.values()).map((r) => [r.outlet, r.itemCode, r.itemLabel, r.unit, String(Math.max(0, r.total)), r.color]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const fname = `food-wastage-${period}-report-${yyyy}-${mm}-${dd}.csv`;
  return { filename: fname, csv };
}

export async function listActiveRecipients() {
  return prisma.reportRecipient.findMany({ where: { isActive: true } });
}

export async function saveCsvToFolder(period: Period, folder = "csv") {
  const { filename, csv } = await generateCsv(period);
  const dir = join(process.cwd(), folder);
  mkdirSync(dir, { recursive: true });
  const fullPath = join(dir, filename);
  writeFileSync(fullPath, csv, "utf8");
  return fullPath;
}

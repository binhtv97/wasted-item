import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

function getSettingsDefaults() {
  return { timezone: "UTC", utcOffsetMinutes: 0, cutOffHour: 0 };
}

async function getSettings() {
  try {
    const s = await prisma.reportSetting.findFirst();
    return s ? { timezone: s.timezone, utcOffsetMinutes: s.utcOffsetMinutes, cutOffHour: s.cutOffHour } : getSettingsDefaults();
  } catch {
    return getSettingsDefaults();
  }
}

function getPeriodRange(period, settings) {
  const offset = settings.utcOffsetMinutes;
  const nowUTC = new Date();
  const nowLocal = new Date(nowUTC.getTime() + offset * 60_000);
  const cut = settings.cutOffHour;
  const addDays = (d, date) => { const n = new Date(date); n.setDate(n.getDate() + d); return n; };
  const startLocal = new Date(nowLocal);
  startLocal.setMinutes(0, 0, 0);
  if (period === "daily") {
    if (nowLocal.getHours() < cut) { const prev = addDays(-1, nowLocal); startLocal.setFullYear(prev.getFullYear(), prev.getMonth(), prev.getDate()); }
    else { startLocal.setFullYear(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate()); }
    startLocal.setHours(cut);
    const endLocal = addDays(1, startLocal);
    return { startUTC: new Date(startLocal.getTime() - offset * 60_000), endUTC: new Date(endLocal.getTime() - offset * 60_000) };
  }
  if (period === "weekly") {
    const day = nowLocal.getDay();
    const daysSinceMonday = (day + 6) % 7;
    let monday = addDays(-daysSinceMonday, nowLocal);
    if (daysSinceMonday === 0 && nowLocal.getHours() < cut) { monday = addDays(-7, monday); }
    startLocal.setFullYear(monday.getFullYear(), monday.getMonth(), monday.getDate());
    startLocal.setHours(cut);
    const endLocal = addDays(7, startLocal);
    return { startUTC: new Date(startLocal.getTime() - offset * 60_000), endUTC: new Date(endLocal.getTime() - offset * 60_000) };
  }
  const first = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1);
  if (nowLocal.getDate() === 1 && nowLocal.getHours() < cut) { first.setMonth(first.getMonth() - 1); }
  startLocal.setFullYear(first.getFullYear(), first.getMonth(), first.getDate());
  startLocal.setHours(cut);
  const nextMonth = new Date(startLocal.getFullYear(), startLocal.getMonth() + 1, startLocal.getDate());
  return { startUTC: new Date(startLocal.getTime() - offset * 60_000), endUTC: new Date(nextMonth.getTime() - offset * 60_000) };
}

async function generateCsv(period) {
  const settings = await getSettings();
  const { startUTC, endUTC } = getPeriodRange(period, settings);
  const entries = await prisma.wasteEntry.findMany({
    where: { recordedAt: { gte: startUTC, lt: endUTC } },
    orderBy: { recordedAt: "asc" },
    select: { quantity: true, unit: true, outlet: { select: { outletCode: true } }, item: { select: { itemCode: true, label: true, color: true } } },
  });
  const totals = new Map();
  for (const e of entries) {
    const key = `${e.outlet.outletCode}|${e.item.itemCode}|${e.unit}`;
    const qty = typeof e.quantity === "object" ? Number(e.quantity) : Number(e.quantity);
    const prev = totals.get(key);
    if (prev) prev.total += qty; else totals.set(key, { outlet: e.outlet.outletCode, itemCode: e.item.itemCode, itemLabel: e.item.label, unit: e.unit, color: e.item.color, total: qty });
  }
  const header = ["outlet", "item_code", "item_label", "unit", "total", "color"];
  const rows = Array.from(totals.values()).map((r) => [r.outlet, r.itemCode, r.itemLabel, r.unit, String(Math.max(0, r.total)), r.color]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const filename = `food-wastage-${period}-report-${yyyy}-${mm}-${dd}.csv`;
  return { filename, csv };
}

async function main() {
  const period = (process.argv[2] || "daily").toLowerCase();
  const folder = process.argv[3] || "csv";
  if (!["daily", "weekly", "monthly"].includes(period)) { console.error("Invalid period"); process.exit(1); }
  const { filename, csv } = await generateCsv(period);
  const dir = join(process.cwd(), folder);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, filename);
  writeFileSync(path, csv, "utf8");
  console.log(path);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
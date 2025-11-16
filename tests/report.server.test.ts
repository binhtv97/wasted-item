import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => {
  const findMany = vi.fn(async () => [
    {
      quantity: 10,
      unit: "kg",
      outlet: { outletCode: "OUTLET001" },
      item: { itemCode: "VEGETABLES", label: "Fresh Vegetables", color: "#228B22" },
    },
    {
      quantity: 4,
      unit: "kg",
      outlet: { outletCode: "OUTLET001" },
      item: { itemCode: "FRIES", label: "French Fries", color: "#FFD700" },
    },
  ]);
  return {
    PrismaClient: class {
      reportSetting = { findFirst: vi.fn(async () => null) };
      wasteEntry = { findMany };
      reportRecipient = { findMany: vi.fn(async () => []) };
    },
  };
});

describe("generateCsv", () => {
  it("returns totals CSV and naming convention", async () => {
    const mod = await import("../app/services/report.server");
    vi.spyOn(mod, "getSettings").mockResolvedValue({ timezone: "UTC", utcOffsetMinutes: 0, cutOffHour: 0 });
    const { filename, csv } = await mod.generateCsv("daily");
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    expect(filename).toBe(`food-wastage-daily-report-${yyyy}-${mm}-${dd}.csv`);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("outlet,item_code,item_label,unit,total,color");
    expect(lines[1]).toContain("OUTLET001,VEGETABLES,Fresh Vegetables,kg,10");
    expect(lines[2]).toContain("OUTLET001,FRIES,French Fries,kg,4");
  });

  it("supports weekly and monthly naming", async () => {
    const mod = await import("../app/services/report.server");
    vi.spyOn(mod, "getSettings").mockResolvedValue({ timezone: "UTC", utcOffsetMinutes: 0, cutOffHour: 0 });
    const w = await mod.generateCsv("weekly");
    const m = await mod.generateCsv("monthly");
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    expect(w.filename).toBe(`food-wastage-weekly-report-${yyyy}-${mm}-${dd}.csv`);
    expect(m.filename).toBe(`food-wastage-monthly-report-${yyyy}-${mm}-${dd}.csv`);
  });
});
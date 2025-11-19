import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

async function getSettings() {
  const o = await prisma.outlet.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { timezone: true },
  });
  const tz = String(o?.timezone || "UTC").trim();
  const direct = tz.match(/^(UTC|GMT)([+-]\d{1,2})(?::(\d{2}))?$/i);
  let offset = 0;
  if (direct) {
    offset = Number(direct[2]) * 60 + Number(direct[3] || 0);
  } else {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
        hour12: false,
      });
      const name =
        fmt.formatToParts(new Date()).find((p) => p.type === "timeZoneName")
          ?.value || "UTC";
      const m = name.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
      offset = m ? Number(m[1]) * 60 + Number(m[2] || 0) : 0;
    } catch {}
  }
  return { timezone: tz, utcOffsetMinutes: offset, cutOffHour: 0 };
}

function getPeriodRange(period, settings) {
  const offset = settings.utcOffsetMinutes;
  const nowUTC = new Date();
  const nowLocalMs = nowUTC.getTime() + offset * 60_000;
  const nowLocal = new Date(nowLocalMs);

  const addDays = (d, date) => {
    const n = new Date(date);
    n.setDate(n.getDate() + d);
    return n;
  };

  const startLocal = new Date(nowLocal);
  startLocal.setMinutes(0, 0, 0);

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
    const day = nowLocal.getDay();
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

async function generateCsv(period) {
  const settings = await getSettings();
  const { startUTC, endUTC } = getPeriodRange(period, settings);
  const entries = await prisma.wasteEntry.findMany({
    where: { recordedAt: { gte: startUTC, lt: endUTC } },
    orderBy: { recordedAt: "asc" },
    select: {
      recordedAt: true,
      quantity: true,
      unit: true,
      outlet: { select: { outletCode: true } },
      item: { select: { itemCode: true, label: true, color: true } },
    },
  });
  const header = [
    "date",
    "outlet",
    "item_code",
    "item_label",
    "unit",
    "count",
    "color",
  ];
  const rows = entries.map((e) => {
    const dateISO = e.recordedAt.toISOString();
    const count =
      typeof e.quantity === "object" ? String(e.quantity) : String(e.quantity);
    return [
      dateISO,
      e.outlet.outletCode,
      e.item.itemCode,
      e.item.label,
      e.unit,
      count,
      e.item.color,
    ];
  });
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `food-wastage-${period}-report-${yyyy}-${mm}-${dd}.csv`;
  return { filename, csv };
}

function required(name, value) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getTransportConfig() {
  const host = required("SMTP_HOST", process.env.SMTP_HOST);
  const port = Number(required("SMTP_PORT", process.env.SMTP_PORT));
  const user = required("SMTP_USER", process.env.SMTP_USER);
  const pass = required("SMTP_PASS", process.env.SMTP_PASS);
  return { host, port, auth: { user, pass } };
}

function getFrom() {
  return required("SMTP_FROM", process.env.SMTP_FROM);
}

async function sendReportEmail({ to, period, csv }) {
  const transporter = nodemailer.createTransport(getTransportConfig());
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `food-wastage-${period}-report-${yyyy}-${mm}-${dd}.csv`;
  await transporter.sendMail({
    from: getFrom(),
    to,
    subject: `Food Wastage ${period} Report (${yyyy}-${mm}-${dd})`,
    text: `Please find attached the ${period} report.`,
    attachments: [{ filename, content: csv, contentType: "text/csv" }],
  });
}

async function tick() {
  const settings = await getSettings();
  const offset = settings.utcOffsetMinutes;
  console.log(offset, "=====");
  const nowUTC = new Date();
  console.log(nowUTC, "=====nowUTC");
  const nowLocalMs = nowUTC.getTime() + offset * 60_000;
  const nowLocal = new Date(nowLocalMs);
  console.log(nowLocal, "=====nowLocal");
  const minutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

  const recipients = await prisma.reportRecipient.findMany({
    where: { isActive: true },
  });
  console.log(recipients, "=====");
  for (const r of recipients) {
    const parseTime = (t) => {
      if (!t) return -1;
      const [hh, mm] = String(t).split(":");
      return Number(hh || 0) * 60 + Number(mm || 0);
    };
    const target = parseTime(r.sendTime);
    console.log(target, "=====", minutes);
    if (target === minutes) {
      const period = String(r.reportType).toLowerCase();
      const { filename, csv } = await generateCsv(period);
      const dir = join(process.cwd(), "reports");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, filename), csv, "utf8");
      try {
        await sendReportEmail({ to: r.email, period, csv });
        console.log(`[ReportWorker] Sent ${filename} to ${r.email}`);
      } catch (e) {
        console.error(`[ReportWorker] Email failed for ${r.email}`, e);
      }
      console.log(`[ReportWorker] Generated ${filename} for ${r.email}`);
    }
  }
}

async function main() {
  const once = process.argv.includes("--once");
  console.log(`Report worker started${once ? " (once)" : ""}`);
  await tick();
  // if (once) {
  //   try {
  //     await prisma.$disconnect();
  //   } catch {}
  //   console.log("Report worker finished (once)");
  //   return;
  // }
  setInterval(tick, 10_000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// async function main() {
//   // const once = process.argv.includes("--once");
//   // console.log(`Report worker started${once ? " (once)" : ""}`);
//   // await tick();
//   // if (once) {
//   //   try { await prisma.$disconnect(); } catch {}
//   //   console.log("Report worker finished (once)");
//   //   return;
//   // }
//   // setInterval(tick, 60_000);
//   await sendReportEmail({
//     to: "binhtvse63547@gmail.com",
//     period: "monthly",
//     csv: "date,outlet,item_code,item_label,unit,count,color\n2023-10-01,12345,FOOD001,Chicken Breast,kg,2.5,#FF0000",
//   });
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });

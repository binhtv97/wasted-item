import nodemailer from "nodemailer";

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getTransportConfig() {
  const host = required("SMTP_HOST", process.env.SMTP_HOST);
  const port = Number(required("SMTP_PORT", process.env.SMTP_PORT));
  const user = required("SMTP_USER", process.env.SMTP_USER);
  const pass = required("SMTP_PASS", process.env.SMTP_PASS);
  return { host, port, auth: { user, pass } } as const;
}

function getFrom() {
  return required("SMTP_FROM", process.env.SMTP_FROM);
}

export async function sendReportEmail(params: {
  to: string;
  period: "daily" | "weekly" | "monthly";
  csv: string;
}) {
  const transporter = nodemailer.createTransport(getTransportConfig());
  const { to, period, csv } = params;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const filename = `food-wastage-${period}-report-${yyyy}-${mm}-${dd}.csv`;

  const info = await transporter.sendMail({
    from: getFrom(),
    to,
    subject: `Food Wastage ${period} Report (${yyyy}-${mm}-${dd})`,
    text: `Please find attached the ${period} report.`,
    attachments: [
      {
        filename,
        content: csv,
        contentType: "text/csv",
      },
    ],
  });

  return { messageId: info.messageId };
}
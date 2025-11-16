import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Mailer from "../app/services/mailer.server";

vi.mock("nodemailer", () => {
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: vi.fn(async (opts: any) => ({ messageId: "mock-id", opts })),
      })),
    },
  };
});

describe("sendReportEmail", () => {
  beforeEach(() => {
    process.env.SMTP_HOST = "smtp.test";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_FROM = "noreply@test.com";
  });

  it("sends email with CSV attachment and naming convention", async () => {
    const { messageId } = await Mailer.sendReportEmail({
      to: "manager@test.com",
      period: "daily",
      csv: "date,outlet,item_code,item_label,unit,count\n",
    });

    expect(messageId).toBe("mock-id");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const expectedName = `food-wastage-daily-report-${yyyy}-${mm}-${dd}.csv`;

    // Access mock to assert attachment
    const nodemailer = await import("nodemailer");
    const createTransport = (nodemailer as any).default.createTransport;
    const sendMail = createTransport.mock.results[0].value.sendMail;
    expect(sendMail).toHaveBeenCalled();
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("manager@test.com");
    expect(call.from).toBe("noreply@test.com");
    expect(call.attachments[0].filename).toBe(expectedName);
    expect(call.attachments[0].content).toContain("date,outlet,item_code");
  });

  it("throws when SMTP env missing", async () => {
    delete process.env.SMTP_HOST;
    await expect(
      Mailer.sendReportEmail({ to: "a@b.com", period: "weekly", csv: "x" })
    ).rejects.toThrow(/Missing env: SMTP_HOST/);
  });
});
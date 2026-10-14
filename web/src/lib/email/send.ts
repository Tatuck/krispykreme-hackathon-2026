import "server-only";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Customer } from "@/db/schema";
import { createMagicToken } from "../auth";
import { getBaseUrl } from "../url";
import { now } from "../clock";
import { hasRoom } from "../limits";
import { isAllowedSignupEmail, isDemoEmail, publicDemo } from "../demo";
import type { Locale } from "../gifts";
import { renderEmail, type EmailData, type EmailGift, type EmailKind } from "./templates";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Krispy Kreme Madrid <onboarding@resend.dev>";

// Transactional mails go out even without marketing consent; promotional ones don't.
const MARKETING: EmailKind[] = ["birthday", "winback", "tier_up"];

export type SendResult = { id: number; status: "sent" | "failed" | "preview" | "skipped"; error?: string };

export async function sendCustomerEmail(
  customer: Customer,
  kind: EmailKind,
  extra: { gifts?: EmailGift[]; friendName?: string | null; convertedCount?: number; send?: boolean } = {},
): Promise<SendResult> {
  if (MARKETING.includes(kind) && !customer.marketingConsent) return { id: 0, status: "skipped" };
  if (!(await hasRoom("emails"))) return { id: 0, status: "skipped" };

  const base = await getBaseUrl();
  const locale = (customer.locale === "en" ? "en" : "es") as Locale;
  const data: EmailData = {
    name: customer.name,
    gifts: extra.gifts ?? [],
    walletUrl: `${base}/auth/${createMagicToken(customer.id)}`,
    refUrl: `${base}/r/${customer.refCode}`,
    tier: customer.tier as EmailData["tier"],
    friendName: extra.friendName,
    convertedCount: extra.convertedCount,
  };

  const sentAt = await now();
  const [row] = await db
    .insert(schema.emails)
    .values({ customerId: customer.id, kind, subject: "", html: "", status: "preview", sentAt })
    .returning({ id: schema.emails.id });

  const { subject, html } = renderEmail(kind, data, locale, {
    track: (url) => `${base}/api/e/c/${row.id}?u=${encodeURIComponent(url)}`,
    pixelUrl: `${base}/api/e/o/${row.id}`,
    assetBase: base,
  });

  let status: SendResult["status"] = "preview";
  let error: string | undefined;
  // Fake addresses (@example.com, seed data) are only rendered + logged. On the public demo, real
  // mail goes out only to allowlisted team inboxes (DEMO_EMAIL_ALLOWLIST).
  const sendable = !isDemoEmail(customer.email) && (!publicDemo || isAllowedSignupEmail(customer.email));
  if (resend && extra.send !== false && sendable) {
    try {
      const res = await resend.emails.send({ from: FROM, to: customer.email, subject, html });
      if (res.error) {
        status = "failed";
        error = res.error.message;
      } else status = "sent";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  await db.update(schema.emails).set({ subject, html, status, error }).where(eq(schema.emails.id, row.id));
  if (error) console.warn(`[email] ${kind} to ${customer.email} failed: ${error}`);
  return { id: row.id, status, error };
}

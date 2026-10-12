import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { now } from "./clock";
import { refreshScore } from "./loyalty";

/** First open/click per email counts toward the customer's engagement score. */
export async function trackEmail(emailId: number, kind: "open" | "click") {
  if (!Number.isFinite(emailId)) return;
  const at = await now();
  const col = kind === "open" ? schema.emails.openedAt : schema.emails.clickedAt;
  const updated = await db
    .update(schema.emails)
    .set(kind === "open" ? { openedAt: at } : { clickedAt: at })
    .where(and(eq(schema.emails.id, emailId), isNull(col)))
    .returning({ customerId: schema.emails.customerId, openedAt: schema.emails.openedAt });
  if (!updated.length) return;
  const cid = updated[0].customerId;
  await db
    .update(schema.customers)
    .set(
      kind === "open"
        ? { emailOpens: sql`${schema.customers.emailOpens} + 1` }
        : { emailClicks: sql`${schema.customers.emailClicks} + 1` },
    )
    .where(eq(schema.customers.id, cid));
  // A click implies an open (images are often blocked).
  if (kind === "click") await trackEmail(emailId, "open");
  await refreshScore(cid);
}

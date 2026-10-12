"use server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getLocale } from "@/lib/i18n/server";
import { createMagicToken, getSessionCustomer, markTicketClaimed, setCustomerSession } from "@/lib/auth";
import {
  activeGifts,
  claimTicket,
  findOrCreateCustomer,
  getCustomer,
  issueGift,
  type PurchaseSummary,
  type SignupError,
} from "@/lib/loyalty";
import { sendCustomerEmail } from "@/lib/email/send";
import { getBaseUrl } from "@/lib/url";
import { normalizeCode } from "@/lib/codes";
import { now } from "@/lib/clock";
import { PREORDER_OCCASIONS, parseItems, quotePreorder, type PreorderOccasion } from "@/lib/pricing";

const signupSchema = z.object({
  email: z.email(),
  name: z.string().max(60).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  terms: z.literal("on"),
  marketing: z.string().optional(),
});

export type WonGift = { type: string; code: string; expiresAt: number };

export type ClaimState =
  | { status: "idle" }
  | { status: "error"; error: SignupError | "invalid" | "termsRequired" | "notFound" | "alreadyClaimed" }
  | {
      status: "done";
      gift: WonGift | null;
      /** Existing account claimed without a session: show only this ticket's result. */
      guest: boolean;
      refCode: string | null;
      emailStatus: "sent" | "other";
      /** Purchase effects (null when the cashier had already linked the sale). */
      summary: PurchaseSummary | null;
      stamps: number;
      activeGiftCount: number;
    };

function parseSignup(form: FormData) {
  if (form.get("terms") !== "on") return { error: "termsRequired" as const };
  const parsed = signupSchema.safeParse({
    email: form.get("email"),
    name: form.get("name") || undefined,
    dob: form.get("dob"),
    terms: form.get("terms"),
    marketing: form.get("marketing") || undefined,
  });
  if (!parsed.success) return { error: "invalid" as const };
  return { data: parsed.data };
}

async function finishClaim(
  ticketCode: string,
  customerId: number,
  refCode: string,
  { login }: { login: boolean },
): Promise<ClaimState> {
  const res = await claimTicket(ticketCode, customerId);
  if (!res.ok) return { status: "error", error: res.error };
  // Email + date of birth is not proof of identity: an existing account gets the purchase and
  // the spin, but no session. Seeing the wallet requires the magic-link login.
  if (login) await setCustomerSession(customerId);
  else await markTicketClaimed(normalizeCode(ticketCode));
  const lastEmail = res.gift
    ? await db.query.emails.findFirst({
        where: eq(schema.emails.customerId, customerId),
        orderBy: (e, { desc }) => [desc(e.id)],
      })
    : null;
  revalidatePath("/me");
  const gift = res.gift ? { type: res.gift.type, code: res.gift.code, expiresAt: res.gift.expiresAt } : null;
  const emailStatus = lastEmail?.status === "sent" ? "sent" : "other";
  if (!login) {
    return { status: "done", gift, guest: true, refCode: null, emailStatus, summary: null, stamps: 0, activeGiftCount: 0 };
  }
  const [fresh, gifts] = await Promise.all([getCustomer(customerId), activeGifts(customerId)]);
  return {
    status: "done",
    gift,
    guest: false,
    refCode,
    emailStatus,
    summary: res.summary,
    stamps: fresh?.stamps ?? 0,
    activeGiftCount: gifts.length,
  };
}

/** Ticket QR flow for a new (or not logged-in) customer. */
export async function claimWithSignupAction(ticketCode: string, _prev: ClaimState, form: FormData): Promise<ClaimState> {
  const p = parseSignup(form);
  if ("error" in p) return { status: "error", error: p.error! };
  const locale = await getLocale();
  const r = await findOrCreateCustomer({
    email: p.data.email,
    name: p.data.name,
    dob: p.data.dob,
    locale,
    marketing: p.data.marketing === "on",
  });
  if ("error" in r) return { status: "error", error: r.error };
  return finishClaim(ticketCode, r.customer.id, r.customer.refCode, { login: r.created });
}

/** Ticket QR flow for a customer who already has a session cookie. */
export async function claimAsSessionAction(ticketCode: string): Promise<ClaimState> {
  const c = await getSessionCustomer();
  if (!c) return { status: "error", error: "invalid" };
  return finishClaim(ticketCode, c.id, c.refCode, { login: true });
}

export type ReferralState =
  | { status: "idle" }
  | { status: "error"; error: SignupError | "invalid" | "termsRequired" }
  | { status: "done"; gift: WonGift };

export async function referralSignupAction(refCode: string, _prev: ReferralState, form: FormData): Promise<ReferralState> {
  const p = parseSignup(form);
  if ("error" in p) return { status: "error", error: p.error! };
  const inviter = await db.query.customers.findFirst({
    where: eq(schema.customers.refCode, normalizeCode(refCode)),
  });
  if (!inviter) return { status: "error", error: "invalid" };
  const r = await findOrCreateCustomer(
    {
      email: p.data.email,
      name: p.data.name,
      dob: p.data.dob,
      locale: await getLocale(),
      marketing: p.data.marketing === "on",
    },
    { referredById: inviter.id },
  );
  if ("error" in r) return { status: "error", error: r.error };
  const gift = await issueGift(r.customer.id, "FRIEND_20", "referral_friend");
  await sendCustomerEmail(r.customer, "friend_welcome", {
    gifts: [gift],
    friendName: inviter.name ?? inviter.email.split("@")[0],
  });
  await setCustomerSession(r.customer.id);
  return { status: "done", gift: { type: gift.type, code: gift.code, expiresAt: gift.expiresAt } };
}

export type LoginState = { status: "idle" } | { status: "sent"; demoLink: string | null };

export async function requestMagicLinkAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const c = email ? await db.query.customers.findFirst({ where: eq(schema.customers.email, email) }) : null;
  if (!c) return { status: "sent", demoLink: null }; // don't reveal which emails exist
  await sendCustomerEmail(c, "magic_link");
  // Hackathon convenience: always show the link on screen so the demo doesn't need the inbox.
  const demoLink = `${await getBaseUrl()}/auth/${createMagicToken(c.id)}`;
  return { status: "sent", demoLink };
}

const preorderSchema = z.object({
  items: z.string().max(1000),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  occasion: z.enum(PREORDER_OCCASIONS),
  note: z.string().max(200).optional(),
});

export type PreorderState = { ok: boolean | null; totalCents?: number; boxes?: number; occasion?: PreorderOccasion };

export async function createPreorderAction(_prev: PreorderState, form: FormData): Promise<PreorderState> {
  const c = await getSessionCustomer();
  if (!c) return { ok: false };
  const parsed = preorderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  const at = await now();
  if (parsed.data.pickupDate < new Date(at).toISOString().slice(0, 10)) return { ok: false };
  const items = parseItems(parsed.data.items);
  // Re-priced here: the client total is only a preview.
  const quote = quotePreorder(items, { birthday: c.dob.slice(5) === parsed.data.pickupDate.slice(5) });
  if (!quote) return { ok: false };
  const { pickupDate, occasion, note } = parsed.data;
  await db.insert(schema.preorders).values({
    customerId: c.id,
    pickupDate,
    occasion,
    note,
    items: JSON.stringify(items),
    boxType: items.length === 1 ? items[0].id : "mixed",
    quantity: quote.boxes,
    totalCents: quote.totalCents,
    createdAt: at,
  });
  revalidatePath("/me");
  return { ok: true, totalCents: quote.totalCents, boxes: quote.boxes, occasion };
}

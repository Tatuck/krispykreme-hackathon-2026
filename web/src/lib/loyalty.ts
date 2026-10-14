import "server-only";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Customer, Gift } from "@/db/schema";
import { newGiftCode, newRefCode, newTicketCode, normalizeCode } from "./codes";
import { now, DAY } from "./clock";
import { GIFTS, pickWeighted, type GiftSource, type GiftType } from "./gifts";
import { getWheelWeights } from "./settings";
import {
  computeScore,
  punchCard,
  referralRewards,
  winbackRule,
  type ScoreBreakdown,
  type Tier,
} from "./scoring";
import { sendCustomerEmail } from "./email/send";
import { ageOn, madridMonthDay, madridYear } from "./format";
import { boxStamps, parseItems, type CartLine, type DiscountLine } from "./pricing";
import { hasRoom } from "./limits";

const TIER_RANK: Record<Tier, number> = { original: 0, chocolate: 1, gold: 2 };

export async function getCustomer(id: number) {
  return (await db.query.customers.findFirst({ where: eq(schema.customers.id, id) })) ?? null;
}

export async function issueGift(customerId: number, type: GiftType, source: GiftSource): Promise<Gift> {
  const at = await now();
  const [g] = await db
    .insert(schema.gifts)
    .values({
      code: newGiftCode(),
      customerId,
      type,
      source,
      createdAt: at,
      expiresAt: at + GIFTS[type].validMinutes * 60 * 1000,
    })
    .returning();
  return g;
}

export async function countConvertedReferrals(customerId: number) {
  const [r] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.referrals)
    .where(and(eq(schema.referrals.inviterId, customerId), eq(schema.referrals.status, "converted")));
  return Number(r?.n ?? 0);
}

export async function scoreFor(c: Customer, at?: number): Promise<ScoreBreakdown> {
  return computeScore(
    {
      lastVisitAt: c.lastVisitAt,
      visits: c.visits,
      boxesTotal: c.boxesTotal,
      emailOpens: c.emailOpens,
      emailClicks: c.emailClicks,
      referralsConverted: await countConvertedReferrals(c.id),
    },
    at ?? (await now()),
  );
}

/** Recomputes score/tier; emails the customer when they move up a tier. */
export async function refreshScore(customerId: number, opts: { notify?: boolean } = {}) {
  const c = await getCustomer(customerId);
  if (!c) return null;
  const s = await scoreFor(c);
  await db.update(schema.customers).set({ score: s.total, tier: s.tier }).where(eq(schema.customers.id, c.id));
  if (opts.notify !== false && TIER_RANK[s.tier] > TIER_RANK[c.tier as Tier]) {
    await sendCustomerEmail({ ...c, score: s.total, tier: s.tier }, "tier_up");
  }
  return s;
}

export type SignupInput = {
  email: string;
  name?: string | null;
  dob: string;
  locale: "es" | "en";
  marketing: boolean;
};

export type SignupError = "tooYoung" | "dobMismatch" | "alreadyCustomer" | "selfReferral" | "demoFull";

/** Finds or creates a customer. Existing emails must match the DOB (light anti-fraud for the demo). */
export async function findOrCreateCustomer(
  input: SignupInput,
  opts: { referredById?: number } = {},
): Promise<{ customer: Customer; created: boolean } | { error: SignupError }> {
  const at = await now();
  if (ageOn(input.dob, at) < 14) return { error: "tooYoung" };
  const email = input.email.trim().toLowerCase();
  const existing = await db.query.customers.findFirst({ where: eq(schema.customers.email, email) });
  if (existing) {
    if (opts.referredById) return { error: existing.id === opts.referredById ? "selfReferral" : "alreadyCustomer" };
    if (existing.dob !== input.dob) return { error: "dobMismatch" };
    return { customer: existing, created: false };
  }
  if (!(await hasRoom("customers"))) return { error: "demoFull" };
  let refCode = newRefCode(input.name || email);
  while (await db.query.customers.findFirst({ where: eq(schema.customers.refCode, refCode) })) {
    refCode = newRefCode(input.name || email);
  }
  const [customer] = await db
    .insert(schema.customers)
    .values({
      email,
      name: input.name?.trim() || null,
      dob: input.dob,
      locale: input.locale,
      refCode,
      referredById: opts.referredById ?? null,
      marketingConsent: input.marketing,
      createdAt: at,
    })
    .returning();
  if (opts.referredById) {
    await db.insert(schema.referrals).values({ inviterId: opts.referredById, friendId: customer.id, createdAt: at });
  }
  return { customer, created: true };
}

export type PurchaseSummary = {
  stampsAdded: number;
  freeBoxes: number; // full cards issued as STAMP_BOX wallet gifts
  freeApplied: number; // boxes the card made free on this same sale
  referralConverted: boolean;
};

/**
 * Applies an in-store purchase to a customer: visit, boxes, stamps, referral conversion.
 * `boxStamps` = stamp weight per box (priciest first, as priced); `autoFree` = the counter already
 * discounted the boxes the card makes free (see `stampCardForCart`), so they don't stamp.
 */
export async function applyPurchase(
  customerId: number,
  p: { boxes: number; units: number; amountCents: number; boxStamps?: number[]; autoFree?: boolean },
): Promise<PurchaseSummary> {
  const c = await getCustomer(customerId);
  if (!c) throw new Error("customer not found");
  const at = await now();
  const card = punchCard(c.stamps, p.boxStamps ?? Array(p.boxes).fill(1), !!p.autoFree);
  const { stamps, gifts: earned } = card;
  const firstBox = c.boxesTotal === 0 && p.boxes > 0;

  await db
    .update(schema.customers)
    .set({
      visits: c.visits + 1,
      lastVisitAt: at,
      boxesTotal: c.boxesTotal + p.boxes,
      spendCents: c.spendCents + p.amountCents,
      stamps,
    })
    .where(eq(schema.customers.id, c.id));

  for (let i = 0; i < earned; i++) {
    const g = await issueGift(c.id, "STAMP_BOX", "stamp_card");
    await sendCustomerEmail(c, "stamp_reward", { gifts: [g] });
  }

  let referralConverted = false;
  if (firstBox && c.referredById) {
    const updated = await db
      .update(schema.referrals)
      .set({ status: "converted", convertedAt: at })
      .where(and(eq(schema.referrals.friendId, c.id), eq(schema.referrals.status, "signed_up")))
      .returning();
    if (updated.length) {
      referralConverted = true;
      await rewardInviter(c.referredById, c);
    }
  }

  await refreshScore(c.id);
  return { stampsAdded: card.added, freeBoxes: earned, freeApplied: card.free.length, referralConverted };
}

async function rewardInviter(inviterId: number, friend: Customer) {
  const inviter = await getCustomer(inviterId);
  if (!inviter) return;
  const at = await now();
  const double = await db.query.gifts.findFirst({
    where: and(
      eq(schema.gifts.customerId, inviterId),
      eq(schema.gifts.type, "DOUBLE_REFERRAL"),
      eq(schema.gifts.status, "active"),
    ),
  });
  const hasDouble = !!double && double.expiresAt > at;
  const converted = await countConvertedReferrals(inviterId);
  const rewards = referralRewards(converted, hasDouble);
  // The x2 bonus is only spent on a friend that completes a step of the ladder.
  if (hasDouble && rewards.length) {
    await db.update(schema.gifts).set({ status: "used", usedAt: at }).where(eq(schema.gifts.id, double!.id));
  }
  const issued: Gift[] = [];
  for (const type of rewards) issued.push(await issueGift(inviterId, type, "referral_ladder"));
  await sendCustomerEmail(inviter, "referral_reward", {
    gifts: issued,
    friendName: friend.name ?? friend.email.split("@")[0],
    convertedCount: converted,
  });
  await refreshScore(inviterId);
}

export async function createTicket(p: {
  boxes: number;
  units: number;
  amountCents: number;
  discounts?: DiscountLine[];
  items?: CartLine[];
  customerId?: number | null;
  appliedGiftCode?: string | null;
}) {
  const at = await now();
  const [t] = await db
    .insert(schema.tickets)
    .values({
      code: newTicketCode(),
      ...p,
      discounts: JSON.stringify(p.discounts ?? []),
      items: JSON.stringify(p.items ?? []),
      createdAt: at,
    })
    .returning();
  return t;
}

export type ClaimResult =
  | { ok: true; gift: Gift | null; summary: PurchaseSummary | null }
  | { ok: false; error: "notFound" | "alreadyClaimed" };

/**
 * Claims a ticket for a customer. The wheel spins when the ticket includes a box,
 * or on the customer's very first visit (to hook them in).
 */
export async function claimTicket(ticketCode: string, customerId: number): Promise<ClaimResult> {
  const code = normalizeCode(ticketCode);
  const ticket = await db.query.tickets.findFirst({ where: eq(schema.tickets.code, code) });
  if (!ticket) return { ok: false, error: "notFound" };
  if (ticket.customerId && ticket.customerId !== customerId) return { ok: false, error: "alreadyClaimed" };

  const at = await now();
  // Conditional update = single-use guarantee even with concurrent scans.
  const claimed = await db
    .update(schema.tickets)
    .set({ claimedAt: at, customerId })
    .where(and(eq(schema.tickets.id, ticket.id), isNull(schema.tickets.claimedAt)))
    .returning();
  if (!claimed.length) return { ok: false, error: "alreadyClaimed" };

  const before = await getCustomer(customerId);
  if (!before) return { ok: false, error: "notFound" };
  const firstVisit = before.visits === 0;

  // If the cashier already linked the sale to this member, the purchase was applied then.
  const summary = ticket.customerId
    ? null
    : await applyPurchase(customerId, {
        boxes: ticket.boxes,
        units: ticket.units,
        amountCents: ticket.amountCents,
        boxStamps: boxStamps(parseItems(ticket.items), ticket.boxes),
      });

  let gift: Gift | null = null;
  if (ticket.boxes > 0 || firstVisit) {
    const type = pickWeighted(await getWheelWeights());
    gift = await issueGift(customerId, type, "wheel");
    const fresh = (await getCustomer(customerId))!;
    await sendCustomerEmail(fresh, "gift_won", { gifts: [gift] });
  }
  return { ok: true, gift, summary };
}

export type LookupResult =
  | { kind: "gift"; gift: Gift; customer: Customer | null; state: "active" | "used" | "expired" }
  | { kind: "member"; customer: Customer; gifts: Gift[] }
  | { kind: "none" };

export async function lookupCode(raw: string): Promise<LookupResult> {
  const code = normalizeCode(raw.replace(/^.*\/(r|m)\//, ""));
  const at = await now();
  const gift = await db.query.gifts.findFirst({ where: eq(schema.gifts.code, code) });
  if (gift) {
    const customer = await getCustomer(gift.customerId);
    const state = gift.status === "used" ? "used" : gift.status === "expired" || gift.expiresAt < at ? "expired" : "active";
    return { kind: "gift", gift, customer, state };
  }
  const customer = await db.query.customers.findFirst({ where: eq(schema.customers.refCode, code) });
  if (customer) {
    const gifts = await activeGifts(customer.id, at);
    return { kind: "member", customer, gifts };
  }
  return { kind: "none" };
}

export async function activeGifts(customerId: number, at?: number) {
  const t = at ?? (await now());
  const rows = await db.query.gifts.findMany({
    where: and(eq(schema.gifts.customerId, customerId), eq(schema.gifts.status, "active")),
    orderBy: (g, { asc }) => [asc(g.expiresAt)],
  });
  return rows.filter((g) => g.expiresAt > t);
}

export async function redeemGift(raw: string): Promise<{ ok: true; gift: Gift } | { ok: false; error: "notFound" | "giftUsed" | "giftExpired" }> {
  const code = normalizeCode(raw);
  const at = await now();
  const gift = await db.query.gifts.findFirst({ where: eq(schema.gifts.code, code) });
  if (!gift) return { ok: false, error: "notFound" };
  if (gift.status === "used") return { ok: false, error: "giftUsed" };
  if (gift.status === "expired" || gift.expiresAt < at) return { ok: false, error: "giftExpired" };
  const updated = await db
    .update(schema.gifts)
    .set({ status: "used", usedAt: at })
    .where(and(eq(schema.gifts.id, gift.id), eq(schema.gifts.status, "active")))
    .returning();
  if (!updated.length) return { ok: false, error: "giftUsed" };
  return { ok: true, gift: updated[0] };
}

export type DailyResult = {
  expired: number;
  rescored: number;
  birthdays: string[];
  winbacks: string[];
};

/** Daily automation: expire gifts, rescore everyone, birthday + win-back campaigns. */
export async function runDailyJob(): Promise<DailyResult> {
  const at = await now();
  const expired = await db
    .update(schema.gifts)
    .set({ status: "expired" })
    .where(and(eq(schema.gifts.status, "active"), lt(schema.gifts.expiresAt, at)))
    .returning({ id: schema.gifts.id });

  const all = await db.query.customers.findMany();
  const result: DailyResult = { expired: expired.length, rescored: 0, birthdays: [], winbacks: [] };
  const today = madridMonthDay(at);
  const year = madridYear(at);

  for (const c of all) {
    const s = await refreshScore(c.id, { notify: false });
    if (!s) continue;
    result.rescored++;

    if (c.dob.slice(5) === today && c.lastBirthdayYear !== year) {
      await sendBirthday({ ...c, tier: s.tier, score: s.total });
      result.birthdays.push(c.email);
    }

    if (c.lastVisitAt) {
      const rule = winbackRule(s.tier);
      const idleDays = Math.floor((at - c.lastVisitAt) / DAY);
      const alreadyChased = c.lastWinbackAt !== null && c.lastWinbackAt > c.lastVisitAt;
      if (idleDays >= rule.afterDays && !alreadyChased) {
        await sendWinback({ ...c, tier: s.tier, score: s.total });
        result.winbacks.push(c.email);
      }
    }
  }
  return result;
}

export async function sendBirthday(c: Customer) {
  const at = await now();
  const g = await issueGift(c.id, "BDAY", "birthday");
  await db.update(schema.customers).set({ lastBirthdayYear: madridYear(at) }).where(eq(schema.customers.id, c.id));
  return sendCustomerEmail(c, "birthday", { gifts: [g] });
}

export async function sendWinback(c: Customer) {
  const at = await now();
  const rule = winbackRule(c.tier as Tier);
  const g = await issueGift(c.id, rule.gift, "winback");
  await db.update(schema.customers).set({ lastWinbackAt: at }).where(eq(schema.customers.id, c.id));
  return sendCustomerEmail(c, "winback", { gifts: [g] });
}

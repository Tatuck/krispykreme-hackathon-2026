import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { newGiftCode, newRefCode, newTicketCode } from "./codes";
import { now, DAY } from "./clock";
import { computeScore } from "./scoring";
import { GIFTS, WHEEL_GIFT_TYPES, type GiftType } from "./gifts";
import { renderEmail, type EmailKind } from "./email/templates";
import { cartTotals, giftDiscount, type CartLine } from "./pricing";

const NAMES = [
  "Lucía", "Hugo", "Martina", "Mateo", "Sofía", "Leo", "Paula", "Daniel", "Valeria", "Pablo",
  "Julia", "Álvaro", "Carmen", "Diego", "Alba", "Manuel", "Irene", "Javier", "Elena", "Adrián",
  "Noa", "Marcos", "Claudia", "Sergio", "Sara", "Iker", "Lola", "Nico", "Vega", "Bruno",
  "Olivia", "Gonzalo", "Inés", "Rubén", "Marta", "Andrés", "Aitana", "Carlos", "Blanca", "Raúl",
];

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

const SEED_BOXES = ["dozen-og", "dozen-og", "dozen-mix", "dozen-half", "half-og", "half-mix"];
const SEED_UNITS = ["og", "og", "choc", "pinky", "straw", "biscoff"];
// Madrid opening hours (local), weighted towards the afternoon snack peak.
const SEED_HOURS = [10, 11, 12, 13, 13, 14, 16, 17, 17, 18, 18, 18, 19, 19, 20, 21];
const MADRID_UTC_OFFSET_H = 2; // demo approximation (CEST)

/** Same calendar day, moved to a plausible opening hour. */
const storeHour = (ms: number) =>
  Math.floor(ms / DAY) * DAY + (pick(SEED_HOURS) - MADRID_UTC_OFFSET_H) * 3600_000 + rnd(0, 59) * 60_000;

/** Inserts ~40 realistic fake customers with visits, gifts, referrals and emails. Sends nothing. */
export async function seedDemoData(count = 40) {
  const at = await now();
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const name = NAMES[i % NAMES.length];
    const email = `${name.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase()}.${rnd(10, 99)}${i}@example.com`;
    const createdAt = at - rnd(1, 60) * DAY - rnd(0, 20) * 3600_000;
    // Mix of profiles: one-timers, regulars, fans.
    const profile = Math.random();
    const visits = profile < 0.45 ? 1 : profile < 0.8 ? rnd(2, 4) : rnd(5, 9);
    const span = Math.max(1, Math.floor((at - createdAt) / DAY));
    const lastVisitAt = visits === 1 ? createdAt : at - rnd(0, Math.min(span, profile < 0.8 ? 35 : 10)) * DAY;
    let boxesTotal = 0;
    let spendCents = 0;
    const visitTimes = Array.from({ length: visits }, (_, v) =>
      v === 0 ? createdAt : v === visits - 1 ? lastVisitAt : createdAt + Math.random() * (lastVisitAt - createdAt),
    ).sort((a, b) => a - b);
    const ticketRows = visitTimes.map((day) => {
      const t = Math.min(at - 60_000, storeHour(day));
      const boxCount = Math.random() < 0.65 ? rnd(1, 3) : 0;
      const items: CartLine[] = [];
      for (let b = 0; b < boxCount; b++) items.push({ id: pick(SEED_BOXES), qty: 1 });
      for (let u = boxCount ? rnd(0, 2) : rnd(1, 4); u > 0; u--) items.push({ id: pick(SEED_UNITS), qty: 1 });
      const totals = cartTotals(items)!;
      boxesTotal += totals.boxes;
      spendCents += totals.subtotalCents;
      return {
        code: newTicketCode(),
        boxes: totals.boxes,
        units: totals.units,
        amountCents: totals.subtotalCents,
        items: JSON.stringify(totals.lines.map((l) => ({ id: l.product.id, qty: l.qty }))),
        discounts: "[]",
        createdAt: t,
        claimedAt: t + 120_000,
      };
    });
    // Wheel gifts: one per box visit (and the first visit). About half get redeemed on the next
    // visit, which then carries the discount, so the dashboard's discount cost is realistic.
    const giftPlan = ticketRows.flatMap((t, idx) => {
      if (!(t.boxes > 0 || idx === 0)) return [];
      const type: GiftType = pick(WHEEL_GIFT_TYPES);
      const expiresAt = t.createdAt + GIFTS[type].validMinutes * 60_000;
      const next = ticketRows[idx + 1];
      let usedAt: number | null = null;
      if (next && next.createdAt <= expiresAt && Math.random() < 0.7) {
        const d = giftDiscount(type, cartTotals(JSON.parse(next.items))!);
        if (!("error" in d) && d.cents > 0) {
          const cents = Math.min(d.cents, next.amountCents);
          next.discounts = JSON.stringify([{ kind: type, cents }]);
          next.amountCents -= cents;
          spendCents -= cents;
          usedAt = next.createdAt;
        }
      }
      return [{ type, createdAt: t.createdAt, expiresAt, usedAt }];
    });
    const emailOpens = rnd(0, visits + 1);
    const emailClicks = rnd(0, Math.floor(emailOpens / 2));
    const dobYear = rnd(1965, 2007);
    const dob = `${dobYear}-${String(rnd(1, 12)).padStart(2, "0")}-${String(rnd(1, 28)).padStart(2, "0")}`;
    const s = computeScore({ lastVisitAt, visits, boxesTotal, emailOpens, emailClicks, referralsConverted: 0 }, at);
    const [c] = await db
      .insert(schema.customers)
      .values({
        email,
        name,
        dob,
        locale: Math.random() < 0.85 ? "es" : "en",
        refCode: newRefCode(name),
        marketingConsent: Math.random() < 0.85,
        createdAt,
        lastVisitAt,
        visits,
        boxesTotal,
        spendCents,
        stamps: boxesTotal % 5,
        emailOpens,
        emailClicks,
        score: s.total,
        tier: s.tier,
      })
      .returning();
    ids.push(c.id);
    await db.insert(schema.tickets).values(ticketRows.map((t) => ({ ...t, customerId: c.id })));

    const giftRows = giftPlan.map((g) => ({
      code: newGiftCode(),
      customerId: c.id,
      type: g.type,
      source: "wheel",
      status: g.usedAt ? "used" : g.expiresAt < at ? "expired" : "active",
      createdAt: g.createdAt,
      expiresAt: g.expiresAt,
      usedAt: g.usedAt,
    }));
    if (giftRows.length) await db.insert(schema.gifts).values(giftRows);

    // Email log (rendered with placeholder links, status "preview" since nothing is sent).
    const kinds: EmailKind[] = ["gift_won", ...(visits > 2 ? (["tier_up"] as EmailKind[]) : [])];
    let opensLeft = emailOpens;
    let clicksLeft = emailClicks;
    for (const kind of kinds.concat(Array(Math.max(0, emailOpens - kinds.length)).fill("gift_won"))) {
      const { subject, html } = renderEmail(
        kind,
        { name, gifts: giftRows.slice(0, 1), walletUrl: "#", refUrl: `#/r/${c.refCode}`, tier: s.tier },
        c.locale as "es" | "en",
        { track: (u) => u, pixelUrl: null, assetBase: "" },
      );
      const sentAt = createdAt + 300_000;
      await db.insert(schema.emails).values({
        customerId: c.id,
        kind,
        subject,
        html,
        status: "preview",
        sentAt,
        openedAt: opensLeft-- > 0 ? sentAt + 3600_000 : null,
        clickedAt: clicksLeft-- > 0 ? sentAt + 3700_000 : null,
      });
    }
  }

  // Referrals: ~30% of later customers were invited by an earlier one.
  for (let i = 5; i < ids.length; i++) {
    if (Math.random() > 0.3) continue;
    const inviterId = ids[rnd(0, i - 1)];
    const friendId = ids[i];
    const converted = Math.random() < 0.6;
    await db.insert(schema.referrals).values({
      inviterId,
      friendId,
      status: converted ? "converted" : "signed_up",
      createdAt: at - rnd(1, 30) * DAY,
      convertedAt: converted ? at - rnd(0, 20) * DAY : null,
    });
    await db.update(schema.customers).set({ referredById: inviterId }).where(eqId(friendId));
  }
  return ids.length;
}

const eqId = (id: number) => eq(schema.customers.id, id);

/** The team's own member account: its printed invite QR points at /r/EQUIPO, so it survives resets. */
export const TEAM_ACCOUNT = {
  email: "equipo@hack2026.tatuck.com",
  name: "Equipo Hackathon",
  dob: "2000-01-01",
  refCode: "EQUIPO",
} as const;

export async function ensureTeamAccount() {
  await db
    .insert(schema.customers)
    .values({ ...TEAM_ACCOUNT, locale: "es", marketingConsent: false, createdAt: await now() })
    .onConflictDoNothing();
}

export async function resetAllData() {
  await db.delete(schema.emails);
  await db.delete(schema.gifts);
  await db.delete(schema.referrals);
  await db.delete(schema.tickets);
  await db.delete(schema.preorders);
  await db.delete(schema.customers);
  await db.delete(schema.settings);
  // Recreated fresh (zero visits/stamps) under the same invite code.
  await ensureTeamAccount();
}

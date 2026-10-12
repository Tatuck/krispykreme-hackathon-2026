import "server-only";
import { db } from "@/db";
import { now, DAY } from "./clock";
import { madridMonthDay } from "./format";
import type { Tier } from "./scoring";
import { PRODUCTS, cartTotals, parseDiscounts, parseItems } from "./pricing";

const VAT = 1.1;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const madridSlot = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", hourCycle: "h23" });
// Old tickets without items: cost them as Original Glazed dozens / doughnuts.
const DOZEN_COST = PRODUCTS.find((p) => p.id === "dozen-og")!.costCents;
const UNIT_COST = PRODUCTS.find((p) => p.id === "og")!.costCents;

export async function getDashboardStats() {
  const at = await now();
  const [customers, tickets, gifts, emails, referrals] = await Promise.all([
    db.query.customers.findMany(),
    db.query.tickets.findMany(),
    db.query.gifts.findMany(),
    db.query.emails.findMany({ columns: { html: false } }),
    db.query.referrals.findMany(),
  ]);

  const visited = customers.filter((c) => c.visits >= 1);
  const returning = customers.filter((c) => c.visits >= 2);
  const atRisk = customers.filter((c) => c.lastVisitAt && at - c.lastVisitAt > 21 * DAY);
  const boxes = tickets.reduce((s, t) => s + t.boxes, 0);
  const withBox = tickets.filter((t) => t.boxes > 0).length;
  const used = gifts.filter((g) => g.status === "used").length;
  const delivered = emails.filter((e) => e.status !== "failed");
  const opened = delivered.filter((e) => e.openedAt).length;
  const clicked = delivered.filter((e) => e.clickedAt).length;
  const converted = referrals.filter((r) => r.status === "converted").length;

  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  // Sign-ups per day, last 30 days (app clock).
  const days: { day: string; signups: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = at - i * DAY;
    const key = madridMonthDay(d);
    days.push({ day: key.split("-").reverse().join("/"), signups: 0 });
  }
  const index = new Map(days.map((d, i) => [d.day, i]));
  for (const c of customers) {
    const key = madridMonthDay(c.createdAt).split("-").reverse().join("/");
    const i = index.get(key);
    if (i !== undefined && at - c.createdAt <= 30 * DAY) days[i].signups++;
  }

  const tiers: Record<Tier, number> = { original: 0, chocolate: 0, gold: 0 };
  for (const c of customers) tiers[c.tier as Tier] = (tiers[c.tier as Tier] ?? 0) + 1;

  const byType = new Map<string, { type: string; issued: number; redeemed: number }>();
  for (const g of gifts) {
    const row = byType.get(g.type) ?? { type: g.type, issued: 0, redeemed: 0 };
    row.issued++;
    if (g.status === "used") row.redeemed++;
    byType.set(g.type, row);
  }

  // Unit economics: net revenue (ex VAT), ingredient cost, discounts given.
  let costCents = 0;
  let discountCents = 0;
  const revenueCents = tickets.reduce((sum, t) => sum + t.amountCents, 0);
  for (const t of tickets) {
    const totals = cartTotals(parseItems(t.items));
    costCents += totals?.lines.length ? totals.costCents : t.boxes * DOZEN_COST + t.units * UNIT_COST;
    discountCents += parseDiscounts(t.discounts).reduce((sum, d) => sum + d.cents, 0);
  }
  const netCents = revenueCents / VAT;
  const economics = {
    netCents: Math.round(netCents),
    costCents,
    discountNetCents: Math.round(discountCents / VAT),
    grossMargin: netCents ? Math.round(((netCents - costCents) / netCents) * 100) : 0,
    discountShare: revenueCents + discountCents ? Math.round((discountCents / (revenueCents + discountCents)) * 100) : 0,
  };

  // Behaviour: average ticket, days between visits, visit frequency, when they come.
  const byCustomer = new Map<number, number[]>();
  for (const t of tickets) {
    if (!t.customerId) continue;
    byCustomer.set(t.customerId, [...(byCustomer.get(t.customerId) ?? []), t.createdAt]);
  }
  const gaps: number[] = [];
  for (const times of byCustomer.values()) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / DAY);
  }
  const frequency = [
    { bucket: "1", customers: customers.filter((c) => c.visits === 1).length },
    { bucket: "2", customers: customers.filter((c) => c.visits === 2).length },
    { bucket: "3", customers: customers.filter((c) => c.visits === 3).length },
    { bucket: "4+", customers: customers.filter((c) => c.visits >= 4).length },
  ];
  const heat = WEEKDAYS.map(() => Array<number>(24).fill(0));
  for (const t of tickets) {
    const parts = Object.fromEntries(madridSlot.formatToParts(t.createdAt).map((p) => [p.type, p.value]));
    const d = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
    if (d >= 0) heat[d][Number(parts.hour) % 24]++;
  }

  return {
    economics,
    behaviour: {
      avgTicketCents: tickets.length ? Math.round(revenueCents / tickets.length) : 0,
      avgGapDays: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null,
      frequency,
      heat,
    },
    kpis: {
      customers: customers.length,
      returnRate: pct(returning.length, visited.length),
      boxes,
      boxShare: pct(withBox, tickets.length),
      redemption: pct(used, gifts.length),
      openRate: pct(opened, delivered.length),
      referrals: `${converted}/${referrals.length}`,
      atRisk: atRisk.length,
    },
    signups: days,
    tiers,
    giftsByType: [...byType.values()].sort((a, b) => b.issued - a.issued),
    emailFunnel: { sent: delivered.length, opened, clicked },
    atRiskList: atRisk
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((c) => ({ id: c.id, name: c.name ?? c.email, tier: c.tier, score: c.score, idle: Math.floor((at - c.lastVisitAt!) / DAY) })),
  };
}

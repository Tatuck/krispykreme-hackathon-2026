import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, pickWeighted, WHEEL_GIFT_TYPES } from "../gifts";
import { computeScore, punchCard, referralRewards, tierFor, tierUpGift, winbackRule } from "../scoring";
import { ageOn } from "../format";

const DAY = 86_400_000;

describe("pickWeighted", () => {
  it("maps rand ranges onto cumulative weights", () => {
    expect(pickWeighted(DEFAULT_WEIGHTS, 0)).toBe("BOX_15");
    expect(pickWeighted(DEFAULT_WEIGHTS, 0.34)).toBe("BOX_15");
    expect(pickWeighted(DEFAULT_WEIGHTS, 0.35)).toBe("FREE_GLAZED");
    expect(pickWeighted(DEFAULT_WEIGHTS, 0.999)).toBe("COFFEE_BOX");
  });
  it("skips zero-weight gifts and falls back when all are zero", () => {
    const only = Object.fromEntries(WHEEL_GIFT_TYPES.map((t) => [t, t === "FREE_NOW" ? 1 : 0])) as typeof DEFAULT_WEIGHTS;
    expect(pickWeighted(only, 0.5)).toBe("FREE_NOW");
    const none = Object.fromEntries(WHEEL_GIFT_TYPES.map((t) => [t, 0])) as typeof DEFAULT_WEIGHTS;
    expect(pickWeighted(none, 0.5)).toBe("BOX_15");
  });
  it("roughly follows the configured odds", () => {
    const n = 20000;
    let box = 0;
    for (let i = 0; i < n; i++) if (pickWeighted(DEFAULT_WEIGHTS) === "BOX_15") box++;
    expect(box / n).toBeGreaterThan(0.32);
    expect(box / n).toBeLessThan(0.38);
  });
});

describe("computeScore", () => {
  const now = Date.UTC(2026, 9, 9);
  it("is 0 for a brand new customer", () => {
    const s = computeScore({ lastVisitAt: null, visits: 0, boxesTotal: 0, emailOpens: 0, emailClicks: 0, referralsConverted: 0 }, now);
    expect(s.total).toBe(0);
    expect(s.tier).toBe("original");
  });
  it("caps every component and reaches gold for a super fan", () => {
    const s = computeScore({ lastVisitAt: now - DAY, visits: 20, boxesTotal: 30, emailOpens: 50, emailClicks: 50, referralsConverted: 10 }, now);
    expect(s).toMatchObject({ recency: 30, frequency: 25, monetary: 20, engagement: 15, referrals: 10, total: 100, tier: "gold" });
  });
  it("decays with recency", () => {
    const base = { visits: 3, boxesTotal: 3, emailOpens: 2, emailClicks: 0, referralsConverted: 0 };
    const fresh = computeScore({ ...base, lastVisitAt: now - 2 * DAY }, now).total;
    const stale = computeScore({ ...base, lastVisitAt: now - 45 * DAY }, now).total;
    expect(fresh - stale).toBe(27);
  });
  it("tier thresholds", () => {
    expect([tierFor(39), tierFor(40), tierFor(74), tierFor(75)]).toEqual(["original", "chocolate", "chocolate", "gold"]);
  });
});

describe("rules", () => {
  it("valuable customers are chased sooner with a bigger offer", () => {
    expect(winbackRule("gold")).toEqual({ afterDays: 21, gift: "WINBACK_30" });
    expect(winbackRule("original")).toEqual({ afterDays: 30, gift: "WINBACK_15" });
  });
  it("referral ladder: doughnut per friend, dozen every 3rd, double bonus", () => {
    expect(referralRewards(1, false)).toEqual([]);
    expect(referralRewards(2, true)).toEqual([]); // x2 bonus waits for the next step
    expect(referralRewards(3, false)).toEqual(["REF_HALF_DOZEN"]);
    expect(referralRewards(3, true)).toEqual(["REF_HALF_DOZEN", "REF_HALF_DOZEN"]);
    expect(referralRewards(5, false)).toEqual([]);
    expect(referralRewards(6, false)).toEqual(["REF_HALF_50"]);
    expect(referralRewards(9, true)).toEqual(["REF_HALF_50", "REF_HALF_50"]);
  });
  it("stamp card at the counter: the 6th box of the sale is free, leftover goes on the next card", () => {
    const dozens = (n: number) => Array(n).fill(1);
    expect(punchCard(0, dozens(6), true)).toEqual({ stamps: 0, free: [5], gifts: 0, added: 5 });
    expect(punchCard(0, dozens(7), true)).toEqual({ stamps: 1, free: [5], gifts: 0, added: 6 });
    expect(punchCard(0, dozens(12), true)).toEqual({ stamps: 0, free: [5, 11], gifts: 0, added: 10 });
    expect(punchCard(3, dozens(3), true)).toEqual({ stamps: 0, free: [2], gifts: 0, added: 2 });
  });
  it("stamp card: a card that ends full becomes a wallet gift", () => {
    expect(punchCard(0, Array(5).fill(1), true)).toEqual({ stamps: 0, free: [], gifts: 1, added: 5 });
    expect(punchCard(0, Array(11).fill(1), true)).toEqual({ stamps: 0, free: [5], gifts: 1, added: 10 });
  });
  it("stamp card: half dozens stamp half, fractions carry over", () => {
    expect(punchCard(0, [0.5, 0.5], true)).toMatchObject({ stamps: 1, added: 1 });
    expect(punchCard(4.5, [1, 1], true)).toEqual({ stamps: 0.5, free: [1], gifts: 0, added: 1 });
    expect(punchCard(4.5, [0.5], true)).toEqual({ stamps: 0, free: [], gifts: 1, added: 0.5 });
  });
  it("stamp card on an already charged ticket: every full card is a gift", () => {
    expect(punchCard(3, [1], false)).toEqual({ stamps: 4, free: [], gifts: 0, added: 1 });
    expect(punchCard(4, Array(7).fill(1), false)).toEqual({ stamps: 1, free: [], gifts: 2, added: 7 });
  });
  it("age gate", () => {
    const at = Date.UTC(2026, 9, 9);
    expect(ageOn("2012-10-09", at)).toBe(14);
    expect(ageOn("2012-10-10", at)).toBe(13);
  });
});

describe("tierUpGift", () => {
  it("gives a gift for Chocolate and Gold, none for the starting tier", () => {
    expect(tierUpGift("original")).toBeNull();
    expect(tierUpGift("chocolate")).toBe("FREE_GLAZED");
    expect(tierUpGift("gold")).toBe("TIER_GOLD_50");
  });
});

// Customer value score (0–100). Pure module so it can be unit-tested and shown in UI.
//
//  Recency     0–30  days since last visit
//  Frequency   0–25  number of visits
//  Monetary    0–20  boxes bought (we reward boxes, not single doughnuts)
//  Engagement  0–15  email opens + clicks
//  Referrals   0–10  friends who converted (bought a box)

export type Tier = "original" | "chocolate" | "gold";

export type ScoreInput = {
  lastVisitAt: number | null;
  visits: number;
  boxesTotal: number;
  emailOpens: number;
  emailClicks: number;
  referralsConverted: number;
};

export type ScoreBreakdown = {
  recency: number;
  frequency: number;
  monetary: number;
  engagement: number;
  referrals: number;
  total: number;
  tier: Tier;
};

const DAY = 24 * 60 * 60 * 1000;

export function recencyPoints(daysSince: number | null): number {
  if (daysSince === null) return 0;
  if (daysSince <= 7) return 30;
  if (daysSince <= 14) return 22;
  if (daysSince <= 21) return 15;
  if (daysSince <= 30) return 8;
  if (daysSince <= 60) return 3;
  return 0;
}

export function tierFor(score: number): Tier {
  if (score >= 75) return "gold";
  if (score >= 40) return "chocolate";
  return "original";
}

export function computeScore(input: ScoreInput, now: number): ScoreBreakdown {
  const daysSince =
    input.lastVisitAt === null ? null : Math.floor((now - input.lastVisitAt) / DAY);
  const recency = recencyPoints(daysSince);
  const frequency = Math.min(25, input.visits * 5);
  const monetary = Math.min(20, input.boxesTotal * 4);
  const engagement = Math.min(10, input.emailOpens * 2) + Math.min(5, input.emailClicks * 2.5);
  const referrals = Math.min(10, input.referralsConverted * 4);
  const total = Math.round(recency + frequency + monetary + engagement + referrals);
  return { recency, frequency, monetary, engagement, referrals, total, tier: tierFor(total) };
}

export const TIER_INFO: Record<Tier, { emoji: string; color: string; min: number; next: number | null }> = {
  original: { emoji: "🍩", color: "#006939", min: 0, next: 40 },
  chocolate: { emoji: "🍫", color: "#6B3E26", min: 40, next: 75 },
  gold: { emoji: "👑", color: "#C99700", min: 75, next: null },
};

/** Win-back threshold: valuable customers get chased sooner and with a bigger offer. */
export function winbackRule(tier: Tier): { afterDays: number; gift: "WINBACK_30" | "WINBACK_15" } {
  return tier === "original"
    ? { afterDays: 30, gift: "WINBACK_15" }
    : { afterDays: 21, gift: "WINBACK_30" };
}

export const REFERRAL_STEP = 3;

/**
 * Referral ladder: what the inviter earns when their Nth friend converts. Only every 3rd friend
 * pays out: the first 3 earn a free half dozen, each further 3 earn 50% off a half dozen. A DOUBLE_REFERRAL
 * bonus doubles the next step (and is only spent then).
 */
export function referralRewards(
  convertedCount: number,
  hasDoubleBonus: boolean,
): ("REF_HALF_DOZEN" | "REF_HALF_50")[] {
  if (convertedCount <= 0 || convertedCount % REFERRAL_STEP !== 0) return [];
  const gift = convertedCount === REFERRAL_STEP ? "REF_HALF_DOZEN" : "REF_HALF_50";
  return hasDoubleBonus ? [gift, gift] : [gift];
}

export const STAMPS_PER_CARD = 5;

/** Stamps a box earns: a dozen is one stamp, a half dozen half a stamp. */
export const stampValue = (size: number) => (size >= 12 ? 1 : 0.5);

export type PunchResult = {
  stamps: number; // card progress after the sale (0-4.5)
  free: number[]; // indexes of the boxes that come free with this sale
  gifts: number; // full cards that become a STAMP_BOX wallet gift
  added: number; // stamps earned (free boxes don't stamp)
};

/**
 * Walks the sale's boxes (stamp weight each) over the card. With `autoFree` (sale charged at the
 * counter with the member identified), a full card makes the next box in the same sale free and the
 * leftover goes on the next card; a card that ends full becomes a wallet gift. Without it (ticket
 * already charged), every full card becomes a gift.
 */
export function punchCard(current: number, weights: number[], autoFree: boolean): PunchResult {
  let stamps = current;
  let gifts = 0;
  let added = 0;
  const free: number[] = [];
  weights.forEach((w, i) => {
    if (autoFree && stamps >= STAMPS_PER_CARD) {
      free.push(i);
      stamps -= STAMPS_PER_CARD;
      return;
    }
    stamps += w;
    added += w;
  });
  gifts += Math.floor(stamps / STAMPS_PER_CARD);
  stamps %= STAMPS_PER_CARD;
  return { stamps, free, gifts, added };
}

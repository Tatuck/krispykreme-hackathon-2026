import { TIER_INFO, type Tier } from "@/lib/scoring";
import { dicts } from "@/lib/i18n/dict";

export function TierChip({ tier, locale }: { tier: string; locale: "es" | "en" }) {
  const info = TIER_INFO[tier as Tier] ?? TIER_INFO.original;
  return (
    <span className="chip text-white" style={{ background: info.color }}>
      {info.emoji} {dicts[locale].tiers[tier as Tier] ?? tier}
    </span>
  );
}

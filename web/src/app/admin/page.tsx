import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getDashboardStats } from "@/lib/admin-stats";
import { TIER_INFO, type Tier } from "@/lib/scoring";
import { fmtEuro } from "@/lib/format";
import { FrequencyChart, GiftsChart, SignupsChart } from "./Charts";

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-black tracking-widest text-kk-muted uppercase">{label}</p>
      <p className="mt-1 text-3xl font-black text-kk-green tabular-nums">{value}</p>
      {hint && <p className="text-xs text-kk-muted">{hint}</p>}
    </div>
  );
}

function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
      <span className="font-bold">{label}</span>
      <div className="h-3 rounded-full bg-kk-cream">
        <div className="h-full rounded-full" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
      <span className="text-right font-black tabular-nums">{value}</span>
    </div>
  );
}

/** Weekday × opening-hour grid; cell shade = tickets in that slot (single green ramp). */
function Heatmap({ heat, days }: { heat: number[][]; days: string[] }) {
  const hours = Array.from({ length: 13 }, (_, i) => i + 10); // 10:00–22:00
  const max = Math.max(1, ...heat.flatMap((row) => hours.map((h) => row[h])));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-[11px] text-kk-muted">
        <thead>
          <tr>
            <th />
            {hours.map((h) => (
              <th key={h} className="font-bold tabular-nums">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row, d) => (
            <tr key={d}>
              <th className="pr-1 text-left font-bold">{days[d]}</th>
              {hours.map((h) => (
                <td
                  key={h}
                  title={`${days[d]} ${h}:00 · ${row[h]}`}
                  className="h-6 min-w-6 rounded"
                  style={{ background: row[h] ? `rgba(0,105,57,${0.15 + 0.85 * (row[h] / max)})` : "#f6efe6" }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminDashboard() {
  const { t, locale } = await getT();
  const s = await getDashboardStats();
  const tierMax = Math.max(1, ...Object.values(s.tiers));
  return (
    <div className="space-y-6">
      {s.kpis.customers === 0 && (
        <div className="card border-2 border-dashed border-kk-orange text-center">
          <p className="font-bold">
            {t.admin.seedHelp} <Link href="/admin/demo" className="text-kk-red underline">{t.admin.demo}</Link>
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t.admin.kpiCustomers} value={s.kpis.customers} />
        <Kpi label={t.admin.kpiReturn} value={`${s.kpis.returnRate}%`} hint="≥ 2 visits" />
        <Kpi label={t.admin.kpiBoxes} value={s.kpis.boxes} />
        <Kpi label={t.admin.kpiBoxShare} value={`${s.kpis.boxShare}%`} />
        <Kpi label={t.admin.kpiRedemption} value={`${s.kpis.redemption}%`} />
        <Kpi label={t.admin.kpiOpen} value={`${s.kpis.openRate}%`} />
        <Kpi label={t.admin.kpiReferrals} value={s.kpis.referrals} />
        <Kpi label={t.admin.kpiAtRisk} value={s.kpis.atRisk} hint="> 21 days" />
      </div>

      <section className="space-y-3">
        <h2 className="h-display text-base text-kk-green">{t.admin.economics}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label={t.admin.kpiNet} value={fmtEuro(s.economics.netCents, locale)} />
          <Kpi label={t.admin.kpiMargin} value={`${s.economics.grossMargin}%`} hint={t.admin.afterGifts} />
          <Kpi
            label={t.admin.kpiDiscounts}
            value={fmtEuro(s.economics.discountNetCents, locale)}
            hint={`${s.economics.discountShare}% ${t.admin.ofGross}`}
          />
          <Kpi label={t.admin.kpiAvgTicket} value={fmtEuro(s.behaviour.avgTicketCents, locale)} />
          <Kpi label={t.admin.kpiGap} value={s.behaviour.avgGapDays ?? "—"} />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-green">{t.admin.frequencyChart}</h2>
          <FrequencyChart data={s.behaviour.frequency} />
        </section>
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-green">{t.admin.heatmap}</h2>
          <Heatmap heat={s.behaviour.heat} days={locale === "es" ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]} />
        </section>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-green">{t.admin.signups}</h2>
          <SignupsChart data={s.signups} />
        </section>
        <section className="card space-y-5">
          <div className="space-y-3">
            <h2 className="h-display text-base text-kk-green">{t.admin.tierMix}</h2>
            {(Object.keys(s.tiers) as Tier[]).map((k) => (
              <HBar key={k} label={`${TIER_INFO[k].emoji} ${t.tiers[k]}`} value={s.tiers[k]} max={tierMax} color={TIER_INFO[k].color} />
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="h-display text-base text-kk-green">{t.admin.emailFunnel}</h2>
            <HBar label="Sent" value={s.emailFunnel.sent} max={s.emailFunnel.sent} color="#006939" />
            <HBar label={`${t.admin.opened}`} value={s.emailFunnel.opened} max={s.emailFunnel.sent} color="#006939" />
            <HBar label={`${t.admin.clicked}`} value={s.emailFunnel.clicked} max={s.emailFunnel.sent} color="#006939" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-green">{t.admin.giftFunnel}</h2>
          <GiftsChart data={s.giftsByType} />
        </section>
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-red">{t.admin.atRisk}</h2>
          <ul className="space-y-2">
            {s.atRiskList.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/customers/${c.id}`} className="flex items-center justify-between rounded-xl bg-kk-cream px-3 py-2 text-sm hover:bg-kk-sand">
                  <span className="font-bold">
                    {TIER_INFO[c.tier as Tier].emoji} {c.name}
                  </span>
                  <span className="text-kk-muted">
                    {c.score} pts · {c.idle} {t.common.days}
                  </span>
                </Link>
              </li>
            ))}
            {s.atRiskList.length === 0 && <li className="text-sm text-kk-muted">—</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

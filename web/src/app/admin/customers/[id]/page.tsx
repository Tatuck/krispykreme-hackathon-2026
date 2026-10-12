import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { now, DAY } from "@/lib/clock";
import { scoreFor } from "@/lib/loyalty";
import { fmtDate, fmtEuro } from "@/lib/format";
import { GIFTS, giftTitle, type GiftType } from "@/lib/gifts";
import { winbackRule, type Tier } from "@/lib/scoring";
import { TierChip } from "../../TierChip";
import { CampaignButtons } from "./CampaignButtons";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, locale } = await getT();
  const c = await db.query.customers.findFirst({ where: eq(schema.customers.id, Number(id)) });
  if (!c) notFound();
  const at = await now();
  const [s, gifts, emails, tickets, invited, inviter] = await Promise.all([
    scoreFor(c, at),
    db.query.gifts.findMany({ where: eq(schema.gifts.customerId, c.id), orderBy: [desc(schema.gifts.createdAt)] }),
    db.query.emails.findMany({ where: eq(schema.emails.customerId, c.id), orderBy: [desc(schema.emails.id)], columns: { html: false } }),
    db.query.tickets.findMany({ where: eq(schema.tickets.customerId, c.id), orderBy: [desc(schema.tickets.createdAt)] }),
    db.query.referrals.findMany({ where: eq(schema.referrals.inviterId, c.id) }),
    c.referredById ? db.query.customers.findFirst({ where: eq(schema.customers.id, c.referredById) }) : null,
  ]);
  const friends = invited.length
    ? await db.query.customers.findMany({ where: inArray(schema.customers.id, invited.map((r) => r.friendId)) })
    : [];
  const idle = c.lastVisitAt ? Math.floor((at - c.lastVisitAt) / DAY) : null;
  const rule = winbackRule(s.tier as Tier);
  const parts = [
    [t.admin.recency, s.recency, 30],
    [t.admin.frequency, s.frequency, 25],
    [t.admin.monetary, s.monetary, 20],
    [t.admin.engagement, s.engagement, 15],
    [t.admin.referralsPts, s.referrals, 10],
  ] as const;

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="text-xs font-bold tracking-wider text-kk-muted uppercase underline">← {t.admin.customers}</Link>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="h-display text-2xl text-kk-green">{c.name ?? c.email}</h2>
              <p className="text-sm text-kk-muted">{c.email}</p>
              <p className="text-sm text-kk-muted">
                {c.dob} · {c.locale.toUpperCase()} · {c.marketingConsent ? "✅ marketing" : "🚫 marketing"} · <span className="font-mono">{c.refCode}</span>
              </p>
              {inviter && (
                <p className="text-sm">
                  {t.admin.invitedBy}:{" "}
                  <Link href={`/admin/customers/${inviter.id}`} className="font-bold text-kk-green underline">{inviter.name ?? inviter.email}</Link>
                </p>
              )}
            </div>
            <TierChip tier={s.tier} locale={locale} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              [t.admin.score, s.total],
              [t.admin.visits, c.visits],
              [t.admin.boxes, c.boxesTotal],
              ["€", fmtEuro(c.spendCents, locale)],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-xl bg-kk-cream p-2">
                <p className="text-[10px] font-black tracking-widest text-kk-muted uppercase">{l}</p>
                <p className="text-lg font-black text-kk-green">{v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="h-display text-base text-kk-green">{t.admin.breakdown}</h3>
            {parts.map(([label, v, max]) => (
              <div key={label} className="grid grid-cols-[90px_1fr_52px] items-center gap-2 text-sm">
                <span>{label}</span>
                <div className="h-2.5 rounded-full bg-kk-cream">
                  <div className="h-full rounded-full bg-kk-green" style={{ width: `${(v / max) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">
                  <b>{v}</b>/{max}
                </span>
              </div>
            ))}
          </div>
          <p className="rounded-xl bg-kk-cream p-3 text-sm">
            {t.admin.lastVisit}: <b>{idle === null ? t.admin.never : `${idle} ${t.admin.daysAgo}`}</b> · win-back @ {rule.afterDays}d{" "}
            <b>{giftTitle(rule.gift, locale)}</b>
          </p>
          <CampaignButtons customerId={c.id} />
        </section>

        <div className="space-y-6">
          <section className="card">
            <h3 className="mb-2 h-display text-base text-kk-green">{t.wallet.gifts} ({gifts.length})</h3>
            <ul className="divide-y divide-kk-green/10 text-sm">
              {gifts.map((g) => {
                const state = g.status === "active" && g.expiresAt < at ? "expired" : g.status;
                return (
                  <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>
                      {GIFTS[g.type as GiftType]?.emoji} {giftTitle(g.type, locale)} <span className="font-mono text-xs text-kk-muted">{g.code}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-kk-muted">
                      {g.source} · {fmtDate(g.createdAt, locale)}
                      <span className={`chip ${state === "used" ? "bg-kk-green-light text-kk-green" : state === "active" ? "bg-kk-yellow/40 text-kk-dark" : "bg-kk-ink/10"}`}>
                        {state}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="card">
            <h3 className="mb-2 h-display text-base text-kk-green">{t.admin.emails} ({emails.length})</h3>
            <ul className="divide-y divide-kk-green/10 text-sm">
              {emails.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/admin/emails/${e.id}`} className="truncate hover:underline">{e.subject}</Link>
                  <span className="shrink-0 text-xs text-kk-muted">
                    {e.status} {e.openedAt ? "· 👀" : ""} {e.clickedAt ? "· 👆" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card">
              <h3 className="mb-2 h-display text-base text-kk-green">{t.staff.recentTickets}</h3>
              <ul className="space-y-1 text-sm">
                {tickets.slice(0, 10).map((tk) => (
                  <li key={tk.id} className="flex justify-between">
                    <span>{fmtDate(tk.createdAt, locale)}</span>
                    <span>{tk.boxes} {tk.boxes === 1 ? t.ticket.box : t.ticket.boxes}, {tk.units} {t.ticket.units}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card">
              <h3 className="mb-2 h-display text-base text-kk-green">{t.admin.invited} ({invited.length})</h3>
              <ul className="space-y-1 text-sm">
                {invited.map((r) => {
                  const f = friends.find((x) => x.id === r.friendId);
                  return (
                    <li key={r.id} className="flex justify-between">
                      <Link href={`/admin/customers/${r.friendId}`} className="hover:underline">{f?.name ?? f?.email}</Link>
                      <span>{r.status === "converted" ? "✅" : "⏳"}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

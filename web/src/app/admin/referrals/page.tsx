import Link from "next/link";
import { db } from "@/db";
import { getT } from "@/lib/i18n/server";
import { TierChip } from "../TierChip";

export default async function ReferralsPage() {
  const { t, locale } = await getT();
  const [refs, customers] = await Promise.all([db.query.referrals.findMany(), db.query.customers.findMany()]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  const groups = new Map<number, typeof refs>();
  for (const r of refs) groups.set(r.inviterId, [...(groups.get(r.inviterId) ?? []), r]);
  const ranked = [...groups.entries()]
    .map(([inviterId, list]) => ({
      inviter: byId.get(inviterId),
      list,
      converted: list.filter((r) => r.status === "converted").length,
    }))
    .filter((g) => g.inviter)
    .sort((a, b) => b.converted - a.converted || b.list.length - a.list.length);

  return (
    <div className="card space-y-4">
      <h2 className="h-display text-base text-kk-green">{t.admin.topInviters}</h2>
      {ranked.length === 0 && <p className="text-sm text-kk-muted">—</p>}
      <ol className="space-y-3">
        {ranked.map((g, i) => (
          <li key={g.inviter!.id} className="rounded-[15px] bg-kk-cream p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full font-black ${i < 3 ? "bg-kk-yellow" : "bg-white"}`}>{i + 1}</span>
                <Link href={`/admin/customers/${g.inviter!.id}`} className="font-black text-kk-green hover:underline">
                  {g.inviter!.name ?? g.inviter!.email}
                </Link>
                <TierChip tier={g.inviter!.tier} locale={locale} />
              </div>
              <span className="text-sm">
                <b>{g.converted}</b> ✅ / {g.list.length} {t.admin.invited.toLowerCase()} · 🏆 {Math.floor(g.converted / 3)}
              </span>
            </div>
            {/* referral tree: inviter friends */}
            <ul className="mt-3 ml-4 space-y-1 border-l-2 border-kk-green/20 pl-4 text-sm">
              {g.list.map((r) => {
                const f = byId.get(r.friendId);
                return (
                  <li key={r.id} className="flex items-center gap-2">
                    <span className="text-kk-green/50">└</span>
                    <Link href={`/admin/customers/${r.friendId}`} className="hover:underline">{f?.name ?? f?.email}</Link>
                    <span className={`chip ${r.status === "converted" ? "bg-kk-green-light text-kk-green" : "bg-white text-kk-muted"}`}>
                      {r.status === "converted" ? t.referral.friendConverted : t.referral.friendPending}
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

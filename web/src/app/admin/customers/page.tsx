import Link from "next/link";
import { desc, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { now, DAY } from "@/lib/clock";
import { fmtDate, fmtEuro } from "@/lib/format";
import { TierChip } from "../TierChip";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { t, locale } = await getT();
  const { q, sort } = await searchParams;
  const at = await now();
  const term = q?.trim() ? `%${q.trim().toLowerCase()}%` : null;
  const rows = await db.query.customers.findMany({
    where: term ? or(like(schema.customers.email, term), like(schema.customers.name, term)) : undefined,
    orderBy: [sort === "recent" ? desc(schema.customers.createdAt) : desc(schema.customers.score)],
    limit: 200,
  });
  return (
    <div className="card space-y-4">
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder={t.admin.search} className="input max-w-sm" />
        <select name="sort" defaultValue={sort ?? "score"} className="input w-auto">
          <option value="score">↓ {t.admin.score}</option>
          <option value="recent">↓ {t.admin.joined}</option>
        </select>
        <button className="btn-green">{t.staff.lookup}</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-black tracking-widest text-kk-muted uppercase">
              <th className="py-2">{t.admin.customers}</th>
              <th>{t.admin.score}</th>
              <th>{t.admin.tier}</th>
              <th>{t.admin.visits}</th>
              <th>{t.admin.boxes}</th>
              <th>€</th>
              <th>{t.admin.lastVisit}</th>
              <th>{t.admin.joined}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const idle = c.lastVisitAt ? Math.floor((at - c.lastVisitAt) / DAY) : null;
              return (
                <tr key={c.id} className="border-t border-kk-green/10 hover:bg-kk-cream/60">
                  <td className="py-2">
                    <Link href={`/admin/customers/${c.id}`} className="font-bold text-kk-green hover:underline">
                      {c.name ?? "—"}
                    </Link>
                    <div className="text-xs text-kk-muted">{c.email}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-kk-cream">
                        <div className="h-full rounded-full bg-kk-green" style={{ width: `${c.score}%` }} />
                      </div>
                      <b className="tabular-nums">{c.score}</b>
                    </div>
                  </td>
                  <td><TierChip tier={c.tier} locale={locale} /></td>
                  <td className="tabular-nums">{c.visits}</td>
                  <td className="tabular-nums">{c.boxesTotal}</td>
                  <td className="tabular-nums">{fmtEuro(c.spendCents, locale)}</td>
                  <td className={idle !== null && idle > 21 ? "font-bold text-kk-red" : ""}>
                    {idle === null ? t.admin.never : `${idle} ${t.admin.daysAgo}`}
                  </td>
                  <td className="text-kk-muted">{fmtDate(c.createdAt, locale)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

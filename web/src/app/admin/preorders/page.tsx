import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { fmtDate, fmtEuro } from "@/lib/format";
import { PreorderLines } from "@/components/PreorderLines";

export default async function PreordersPage() {
  const { t, locale } = await getT();
  const [rows, customers] = await Promise.all([
    db.query.preorders.findMany({ orderBy: [desc(schema.preorders.pickupDate)] }),
    db.query.customers.findMany({ columns: { id: true, email: true, name: true } }),
  ]);
  const who = new Map(customers.map((c) => [c.id, c.name ?? c.email]));
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-black tracking-widest text-kk-muted uppercase">
            <th className="py-2">{t.preorder.date}</th>
            <th>{t.admin.customers}</th>
            <th>{t.preorder.boxType}</th>
            <th>{t.preorder.quantity}</th>
            <th className="text-right">{t.preorder.total}</th>
            <th className="pl-4">{t.preorder.occasion}</th>
            <th>{t.preorder.note}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center text-kk-muted">—</td></tr>
          )}
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-kk-green/10">
              <td className="py-2 font-bold">{p.pickupDate}</td>
              <td><Link href={`/admin/customers/${p.customerId}`} className="text-kk-green hover:underline">{who.get(p.customerId)}</Link></td>
              <td><PreorderLines preorder={p} labels={t.preorder.boxes} /></td>
              <td className="tabular-nums">{p.quantity}</td>
              <td className="text-right font-bold tabular-nums">{p.totalCents > 0 ? fmtEuro(p.totalCents, locale) : "—"}</td>
              <td className="pl-4">{t.preorder.occasions[p.occasion as keyof typeof t.preorder.occasions] ?? p.occasion}</td>
              <td className="text-kk-muted">{p.note} <span className="text-xs">· {fmtDate(p.createdAt, locale)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

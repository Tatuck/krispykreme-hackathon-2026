import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { fmtDate } from "@/lib/format";

export default async function EmailsPage() {
  const { t, locale } = await getT();
  const [rows, customers] = await Promise.all([
    db.query.emails.findMany({ orderBy: [desc(schema.emails.id)], limit: 100, columns: { html: false } }),
    db.query.customers.findMany({ columns: { id: true, email: true } }),
  ]);
  const email = new Map(customers.map((c) => [c.id, c.email]));
  const statusColor: Record<string, string> = {
    sent: "bg-kk-green-light text-kk-green",
    failed: "bg-kk-red/10 text-kk-red",
    preview: "bg-kk-cream text-kk-muted",
  };
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-black tracking-widest text-kk-muted uppercase">
            <th className="py-2">Subject</th>
            <th>{t.admin.sentTo}</th>
            <th>{t.admin.status}</th>
            <th>{t.admin.opened}</th>
            <th>{t.admin.clicked}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t border-kk-green/10">
              <td className="py-2">
                <Link href={`/admin/emails/${e.id}`} className="font-bold text-kk-green hover:underline">{e.subject}</Link>
                <div className="text-xs text-kk-muted">{e.kind}</div>
              </td>
              <td className="text-xs">{email.get(e.customerId)}</td>
              <td>
                <span className={`chip ${statusColor[e.status] ?? ""}`} title={e.error ?? undefined}>{e.status}</span>
              </td>
              <td>{e.openedAt ? "👀" : ""}</td>
              <td>{e.clickedAt ? "👆" : ""}</td>
              <td className="text-xs text-kk-muted">{fmtDate(e.sentAt, locale, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

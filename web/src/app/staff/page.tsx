import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmtDate, fmtEuro } from "@/lib/format";
import { StaffNav } from "@/components/StaffNav";
import { parseItems, productById } from "@/lib/pricing";
import { Kiosk } from "./Kiosk";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireStaff();
  const { t, locale } = await getT();
  const recent = await db.query.tickets.findMany({ orderBy: [desc(schema.tickets.id)], limit: 8 });
  return (
    <>
      <StaffNav active="staff" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="h-display text-3xl text-kk-green">{t.staff.newSale}</h1>
        <Kiosk />
        <section className="card">
          <h2 className="mb-3 h-display text-base text-kk-green">{t.staff.recentTickets}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm whitespace-nowrap">
              <tbody>
                {recent.map((tk) => (
                  <tr key={tk.id} className="border-t border-kk-green/10">
                    <td className="py-2 font-mono font-bold">
                      <Link href={`/staff/ticket/${tk.code}`} className="text-kk-green underline">{tk.code}</Link>
                    </td>
                    <td className="py-2">{fmtDate(tk.createdAt, locale, true)}</td>
                    <td className="py-2">
                      {parseItems(tk.items)
                        .map((l) => `${l.qty} × ${productById(l.id)!.name[locale]}`)
                        .join(", ") || `${tk.boxes} ${tk.boxes === 1 ? t.ticket.box : t.ticket.boxes}, ${tk.units} ${t.ticket.units}`}
                    </td>
                    <td className="py-2">{fmtEuro(tk.amountCents, locale)}</td>
                    <td className="py-2 text-right">
                      <span className={`chip ${tk.claimedAt ? "bg-kk-green-light text-kk-green" : "bg-kk-cream text-kk-orange"}`}>
                        {tk.claimedAt ? t.staff.claimed : t.staff.pending}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

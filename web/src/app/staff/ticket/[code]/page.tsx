import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getBaseUrl } from "@/lib/url";
import { fmtDate } from "@/lib/format";
import { parseDiscounts, parseItems } from "@/lib/pricing";
import { TicketLines } from "@/components/TicketLines";
import { normalizeCode } from "@/lib/codes";
import { QR } from "@/components/QR";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function TicketPrint({ params }: { params: Promise<{ code: string }> }) {
  await requireStaff();
  const { code } = await params;
  const { t, locale } = await getT();
  const tk = await db.query.tickets.findFirst({ where: eq(schema.tickets.code, normalizeCode(code)) });
  if (!tk) notFound();
  const url = `${await getBaseUrl()}/t/${tk.code}`;
  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <div className="no-print mb-4 flex justify-between">
        <Link href="/staff" className="btn-ghost px-4 py-2 text-xs">← {t.common.back}</Link>
        <PrintButton label={t.staff.print} />
      </div>
      <div className="bg-white px-6 py-8 font-mono text-sm text-kk-dark shadow-xl [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),95%_100%,90%_calc(100%-8px),85%_100%,80%_calc(100%-8px),75%_100%,70%_calc(100%-8px),65%_100%,60%_calc(100%-8px),55%_100%,50%_calc(100%-8px),45%_100%,40%_calc(100%-8px),35%_100%,30%_calc(100%-8px),25%_100%,20%_calc(100%-8px),15%_100%,10%_calc(100%-8px),5%_100%,0_calc(100%-8px))]">
        <Image src="/kk-logo.png" alt="Krispy Kreme" width={960} height={311} className="mx-auto h-auto w-40" />
        <p className="mt-2 text-center text-xs">KRISPY KREME MADRID · GRAN VÍA</p>
        <p className="text-center text-xs">{fmtDate(tk.createdAt, locale, true)} · #{tk.code}</p>
        <div className="my-4 border-t border-dashed border-kk-dark/40" />
        <TicketLines
          boxes={tk.boxes}
          units={tk.units}
          items={parseItems(tk.items)}
          discounts={parseDiscounts(tk.discounts)}
          totalCents={tk.amountCents}
          locale={locale}
          labels={t.staff}
          dashed
        />
        <div className="my-4 border-t border-dashed border-kk-dark/40" />
        <p className="text-center font-sans text-lg font-black tracking-wide text-kk-red uppercase">{t.staff.scanToWin}</p>
        <div className="mt-3 flex justify-center"><QR value={url} size={180} /></div>
        <p className="mt-2 text-center text-[10px] break-all">{url}</p>
      </div>
    </div>
  );
}

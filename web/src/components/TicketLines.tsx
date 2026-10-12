import type { Locale } from "@/lib/gifts";
import { discountLabel, productById, type CartLine, type DiscountLine } from "@/lib/pricing";
import { fmtEuro } from "@/lib/format";

/**
 * Item, discount and total lines of a ticket. Server- and client-safe (props only).
 * `items` (kiosk sales) wins over the boxes/units summary kept for older tickets.
 */
export function TicketLines({
  boxes,
  units,
  items = [],
  discounts,
  totalCents,
  locale,
  labels,
  dashed = false,
}: {
  boxes: number;
  units: number;
  items?: CartLine[];
  discounts: DiscountLine[];
  totalCents: number;
  locale: Locale;
  labels: { subtotal: string; total: string };
  dashed?: boolean;
}) {
  const subtotal = totalCents + discounts.reduce((s, d) => s + d.cents, 0);
  const rule = dashed ? "border-dashed border-kk-dark/40" : "border-kk-green/15";
  return (
    <div className="space-y-1">
      {items.length > 0 ? (
        items.map((l) => {
          const p = productById(l.id)!;
          return (
            <p key={l.id} className="flex justify-between gap-3">
              <span>{l.qty} × {p.name[locale]}</span>
              <span className="whitespace-nowrap">{fmtEuro(l.qty * p.priceCents, locale)}</span>
            </p>
          );
        })
      ) : (
        <>
          {boxes > 0 && <p>{boxes} × {locale === "es" ? "Caja docena" : "Dozen box"}</p>}
          {units > 0 && <p>{units} × {locale === "es" ? "Donut" : "Doughnut"}</p>}
        </>
      )}
      {discounts.length > 0 && (
        <>
          <div className={`my-2 border-t ${rule}`} />
          <p className="flex justify-between gap-3"><span>{labels.subtotal}</span><span>{fmtEuro(subtotal, locale)}</span></p>
          {discounts.map((d, i) => (
            <p key={i} className="flex justify-between gap-3 text-kk-red">
              <span>{discountLabel(d.kind, locale)}</span>
              <span className="whitespace-nowrap">{d.cents > 0 ? `−${fmtEuro(d.cents, locale)}` : fmtEuro(0, locale)}</span>
            </p>
          ))}
        </>
      )}
      <div className={`my-2 border-t ${rule}`} />
      <p className="flex justify-between gap-3 text-base font-bold">
        <span className="uppercase">{labels.total}</span>
        <span>{fmtEuro(totalCents, locale)}</span>
      </p>
    </div>
  );
}

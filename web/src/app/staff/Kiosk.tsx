"use client";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSaleAction, customerLookupAction, type CustomerAtCounter, type SaleState } from "./actions";
import { useT } from "@/lib/i18n/client";
import { DoughnutMountain } from "@/components/DoughnutMountain";
import { DoughnutGlyph } from "@/components/DoughnutGlyph";
import { GIFTS, giftTitle, type GiftType } from "@/lib/gifts";
import { fmtDate, fmtEuro, fmtStamps } from "@/lib/format";
import {
  PRODUCTS,
  TOWER_ID,
  addToCart,
  cartTotals,
  discountLabel,
  fillCartForGift,
  giftDiscount,
  quoteSale,
  stampCardForCart,
  type CartLine,
  type Product,
  type ProductKind,
} from "@/lib/pricing";
import { Scanner } from "@/components/Scanner";
import { DoughnutBox } from "@/components/DoughnutBox";
import { STAMPS_PER_CARD } from "@/lib/scoring";

/** Counter screen: tap products, identify the customer, pick one of their rewards, charge. */
export function Kiosk() {
  const { t, locale } = useT();
  const [state, action, pending] = useActionState<SaleState, FormData>(createSaleAction, { status: "idle" });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerAtCounter | null>(null);
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, startLookup] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // A new action result: a finished sale clears the counter, an error shows until the next edit.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setSubmitError(state.status === "error" ? state.error : null);
    if (state.status === "done") {
      setCart([]);
      setCustomer(null);
      setGiftCode(null);
      setCode("");
      setReceiptOpen(true);
    }
  }

  const totals = cartTotals(cart)!;
  const gift = customer?.gifts.find((g) => g.code === giftCode) ?? null;
  // Same rule the server applies on charge: a full card makes the next box of this sale free.
  const card = customer ? stampCardForCart(customer.stamps, totals) : null;
  const quote = quoteSale(totals, {
    giftType: (gift?.type as GiftType) ?? null,
    birthday: customer?.birthdayToday,
    freeBoxCents: card?.freeCents,
  });
  const qtyOf = (id: string) => cart.find((l) => l.id === id)?.qty ?? 0;

  const changeCart = (next: CartLine[]) => {
    setCart(next);
    setSubmitError(null);
    setReceiptOpen(false); // tapping a product after a sale starts the next one
  };
  const add = (id: string, qty = 1) => changeCart(addToCart(cart, [{ id, qty }]));

  const lookup = (raw: string) =>
    startLookup(async () => {
      setCode(raw.toUpperCase());
      const r = await customerLookupAction(raw);
      if (!r.ok) {
        setLookupError(r.error);
        return;
      }
      setLookupError(null);
      setSubmitError(null);
      setCustomer(r.customer);
      const scanned = r.customer.gifts.find((g) => g.code === r.scannedGift);
      if (scanned) {
        setGiftCode(scanned.code);
        setCart((c) => fillCartForGift(scanned.type as GiftType, c));
      } else {
        setGiftCode(null);
      }
    });

  const pickGift = (g: { code: string; type: string }) => {
    setSubmitError(null);
    if (g.code === giftCode) return setGiftCode(null);
    setGiftCode(g.code);
    setCart((c) => fillCartForGift(g.type as GiftType, c));
  };

  const clearCustomer = () => {
    setCustomer(null);
    setGiftCode(null);
    setCode("");
    setSubmitError(null);
  };

  const errMap: Record<string, string> = {
    notFound: t.staff.notFound,
    demoFull: t.common.demoFull,
    giftUsed: t.staff.giftUsed,
    giftExpired: t.staff.giftExpired,
    giftOtherMember: t.staff.giftOtherMember,
    giftNeedsBox: t.staff.giftNeedsBox,
    giftNeedsUnit: t.staff.giftNeedsUnit,
    giftNeedsBoxes: t.staff.giftNeedsBoxes,
    giftNotAtCounter: t.staff.giftNotAtCounter,
  };
  const quoteError = "error" in quote ? quote.error : null;
  const done = receiptOpen && state.status === "done" ? state : null;

  const sections: { kind: ProductKind; title: string; hint?: string }[] = [
    { kind: "box", title: t.staff.catBoxes, hint: t.staff.catBoxesHint },
    { kind: "unit", title: t.staff.catUnits },
    { kind: "drink", title: t.staff.catDrinks },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Product counter: boxes get the biggest tiles, they're what we want to sell. */}
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.kind} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h2 className="h-display text-xl text-kk-green">{s.title}</h2>
              {s.hint && <p className="text-sm text-kk-muted">{s.hint}</p>}
            </div>
            <div
              className={
                s.kind === "box"
                  ? "grid grid-cols-2 gap-3 xl:grid-cols-3"
                  : "grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5"
              }
            >
              {PRODUCTS.filter((p) => p.kind === s.kind).map((p) => (
                <ProductTile key={p.id} product={p} qty={qtyOf(p.id)} locale={locale} onAdd={() => add(p.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="space-y-4">
        {done ? (
          <div className="space-y-3 rounded-[20px] bg-kk-green p-6 text-white">
            <p className="h-display text-2xl">{t.staff.saleDone}</p>
            <p className="text-4xl font-black tabular-nums">{fmtEuro(done.preview.totalCents, locale)}</p>
            {done.preview.discounts.length > 0 && (
              <p className="font-bold">
                {t.staff.discount}: −{fmtEuro(done.preview.discounts.reduce((sum, d) => sum + d.cents, 0), locale)}
              </p>
            )}
            {done.preview.member && (
              <p>
                {t.staff.attachedTo} <b>{done.preview.member.name}</b>
                {done.summary && done.summary.stampsAdded > 0 && <>, +{fmtStamps(done.summary.stampsAdded, locale)} {t.staff.stampsAdded}</>}
                {done.summary && done.summary.freeApplied > 0 && <>, {done.summary.freeApplied} {t.staff.freeApplied}</>}
                {done.summary && done.summary.freeBoxes > 0 && <> + {giftTitle("STAMP_BOX", locale)}</>}
              </p>
            )}
            {done.summary?.referralConverted && <p className="font-bold">{t.staff.referralConverted}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={`/staff/ticket/${done.ticketCode}`} className="btn bg-white px-5 py-2.5 text-sm text-kk-green hover:bg-kk-cream">
                {t.staff.print}
              </Link>
              <a href={`/t/${done.ticketCode}`} target="_blank" className="btn border-2 border-white px-5 py-2 text-sm text-white hover:bg-white/10">
                {t.staff.openLink}
              </a>
            </div>
            <button type="button" className="btn-primary mt-2 w-full py-4 text-base" onClick={() => setReceiptOpen(false)}>
              {t.staff.newSaleBtn}
            </button>
          </div>
        ) : (
          <>
            {/* Customer: who they are and what they can use today. */}
            <section className="space-y-3 rounded-[20px] bg-white p-5 shadow-[0_6px_18px_-8px_rgba(0,77,42,0.25)]">
              {customer ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="kk-script truncate text-2xl leading-tight text-kk-green">{customer.name}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="chip bg-kk-green-light text-kk-green">{t.tiers[customer.tier as keyof typeof t.tiers]}</span>
                        <span className="chip bg-kk-sand text-kk-dark">
                          {fmtStamps(customer.stamps, locale)}/{STAMPS_PER_CARD} {t.staff.stamps}
                        </span>
                        <span className="chip bg-kk-sand font-mono text-kk-muted">{customer.refCode}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearCustomer}
                      aria-label={t.staff.removeCustomer}
                      title={t.staff.removeCustomer}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl leading-none text-kk-muted hover:bg-kk-sand"
                    >
                      ×
                    </button>
                  </div>

                  {card && card.free.length > 0 && (
                    <p className="rounded-xl bg-kk-green-light px-3 py-2 text-sm font-bold text-kk-green">
                      {t.staff.cardFreeNow.replace("{n}", String(card.free.length))}
                    </p>
                  )}
                  {card && card.gifts > 0 && (
                    <button
                      type="button"
                      onClick={() => add("dozen-og")}
                      className="w-full rounded-xl bg-kk-pink/25 px-3 py-2 text-left text-sm font-bold text-kk-red-dark hover:bg-kk-pink/40"
                    >
                      {t.staff.cardNextFree}
                    </button>
                  )}

                  {customer.birthdayToday && (
                    <p className="rounded-xl bg-kk-pink/25 px-3 py-2 text-sm font-bold text-kk-red-dark">{t.staff.autoBirthday}</p>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-kk-dark">{t.staff.rewards}</h3>
                    {customer.gifts.length === 0 && <p className="text-sm text-kk-muted">{t.staff.noRewards}</p>}
                    {customer.gifts.map((g) => {
                      const type = g.type as GiftType;
                      const effect = giftDiscount(type, totals);
                      const auto = "error" in effect && effect.error === "giftNotAtCounter";
                      const selected = g.code === giftCode;
                      const needsItems = "error" in effect && !auto;
                      return (
                        <button
                          key={g.code}
                          type="button"
                          disabled={auto}
                          aria-pressed={selected}
                          onClick={() => pickGift(g)}
                          className={`flex w-full items-stretch overflow-hidden rounded-xl border-2 text-left transition-colors disabled:cursor-default ${
                            selected
                              ? "border-kk-green bg-kk-green-light"
                              : "border-dashed border-kk-sand bg-white hover:border-kk-green/50 disabled:hover:border-kk-sand"
                          }`}
                        >
                          <span className="w-2 shrink-0" style={{ background: GIFTS[type]?.color }} aria-hidden />
                          <span className="min-w-0 flex-1 px-3 py-2">
                            <span className="block text-sm font-bold text-kk-dark">{giftTitle(type, locale)}</span>
                            <span className="block text-xs text-kk-muted">
                              {auto
                                ? t.staff.autoReferral
                                : `${t.staff.expires} ${fmtDate(g.expiresAt, locale, true)}`}
                            </span>
                          </span>
                          {!auto && (
                            <span
                              className={`flex shrink-0 items-center px-3 text-sm font-black tabular-nums ${
                                selected ? "text-kk-green" : needsItems ? "text-kk-muted" : "text-kk-red"
                              }`}
                            >
                              {needsItems
                                ? t.staff.addAndApply
                                : selected
                                  ? t.staff.applied
                                  : `−${fmtEuro("cents" in effect ? effect.cents : 0, locale)}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="h-display text-lg text-kk-green">{t.staff.customer}</h2>
                  <p className="text-sm text-kk-muted">{t.staff.customerHelp}</p>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (code) lookup(code);
                    }}
                  >
                    <input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setLookupError(null);
                      }}
                      className="input font-mono"
                      placeholder="MARIA7K2"
                      aria-label={t.staff.customer}
                    />
                    <button className="btn-green px-5" disabled={looking || !code}>
                      {looking ? t.common.loading : t.staff.identify}
                    </button>
                  </form>
                  <Scanner onResult={lookup} />
                  {lookupError && <p className="text-sm font-bold text-kk-red">{errMap[lookupError] ?? t.common.error}</p>}
                </>
              )}
            </section>

            {/* The live receipt: what gets printed is exactly what's shown here. */}
            <section className="bg-white px-5 pt-5 pb-8 font-mono text-sm text-kk-dark shadow-[0_6px_18px_-8px_rgba(0,77,42,0.25)] [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),95%_100%,90%_calc(100%-8px),85%_100%,80%_calc(100%-8px),75%_100%,70%_calc(100%-8px),65%_100%,60%_calc(100%-8px),55%_100%,50%_calc(100%-8px),45%_100%,40%_calc(100%-8px),35%_100%,30%_calc(100%-8px),25%_100%,20%_calc(100%-8px),15%_100%,10%_calc(100%-8px),5%_100%,0_calc(100%-8px))]">
              <div className="flex items-center justify-between gap-3">
                <Image src="/kk-logo.png" alt="Krispy Kreme" width={960} height={311} className="h-auto w-24" />
                <span className="font-sans text-sm font-bold text-kk-muted">{t.staff.order}</span>
              </div>
              <div className="my-3 border-t border-dashed border-kk-dark/40" />
              {totals.lines.length === 0 ? (
                <p className="py-6 text-center font-sans text-kk-muted">{t.staff.emptyCart}</p>
              ) : (
                <ul className="space-y-1.5">
                  {totals.lines.map((l) => (
                    <li key={l.product.id} className="flex items-center gap-2">
                      <span className="flex shrink-0 items-center rounded-full bg-kk-sand font-sans">
                        <button
                          type="button"
                          onClick={() => add(l.product.id, -1)}
                          aria-label={`${t.staff.removeOne}: ${l.product.name[locale]}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-kk-green hover:bg-white"
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-black tabular-nums">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => add(l.product.id)}
                          aria-label={`${t.staff.addOne}: ${l.product.name[locale]}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-kk-green hover:bg-white"
                        >
                          +
                        </button>
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{l.product.name[locale]}</span>
                      <span className="whitespace-nowrap tabular-nums">{fmtEuro(l.cents, locale)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!quoteError && "discounts" in quote && quote.discounts.length > 0 && (
                <>
                  <div className="my-3 border-t border-dashed border-kk-dark/40" />
                  <p className="flex justify-between gap-3">
                    <span>{t.staff.subtotal}</span>
                    <span className="tabular-nums">{fmtEuro(quote.subtotalCents, locale)}</span>
                  </p>
                  {quote.discounts.map((d, i) => (
                    <p key={i} className="flex justify-between gap-3 text-kk-red">
                      <span>{discountLabel(d.kind, locale)}</span>
                      <span className="whitespace-nowrap tabular-nums">−{fmtEuro(d.cents, locale)}</span>
                    </p>
                  ))}
                </>
              )}
              <div className="my-3 border-t border-dashed border-kk-dark/40" />
              <p className="flex items-baseline justify-between gap-3 font-sans">
                <span className="h-display text-base">{t.staff.total}</span>
                <span className="text-3xl font-black tabular-nums">
                  {fmtEuro("totalCents" in quote ? quote.totalCents : totals.subtotalCents, locale)}
                </span>
              </p>
            </section>

            {(quoteError || submitError) && (
              <p role="alert" className="rounded-2xl bg-kk-red/10 px-4 py-2 text-sm font-bold text-kk-red">
                {errMap[(quoteError ?? submitError)!] ?? t.common.error}
              </p>
            )}

            <form action={action} className="sticky bottom-0 z-10 -mx-1 bg-kk-cream/95 pt-2 pr-16 pb-4 pl-1">
              <input type="hidden" name="items" value={JSON.stringify(cart)} />
              <input type="hidden" name="memberCode" value={customer?.refCode ?? ""} />
              <input type="hidden" name="giftCode" value={giftCode ?? ""} />
              <button
                className="btn-primary w-full py-5 text-lg"
                disabled={pending || totals.lines.length === 0 || !!quoteError}
              >
                {pending
                  ? t.common.loading
                  : "totalCents" in quote && quote.totalCents === 0 && totals.lines.length > 0
                    ? t.staff.registerFree
                    : `${t.staff.charge} ${fmtEuro("totalCents" in quote ? quote.totalCents : 0, locale)}`}
              </button>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}

function ProductTile({
  product,
  qty,
  locale,
  onAdd,
}: {
  product: Product;
  qty: number;
  locale: "es" | "en";
  onAdd: () => void;
}) {
  const big = product.kind === "box";
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`relative flex flex-col items-center rounded-[20px] border-2 bg-white text-center shadow-[0_6px_18px_-8px_rgba(0,77,42,0.25)] transition-[border-color,transform] active:scale-[0.97] ${
        qty ? "border-kk-green" : "border-transparent hover:border-kk-green/30"
      } ${big ? "gap-3 p-4" : "gap-2 p-3"}`}
    >
      {qty > 0 && (
        <span className="absolute -top-2 -right-2 z-10 grid h-8 min-w-8 place-items-center rounded-full bg-kk-red px-2 text-sm font-black text-white tabular-nums shadow">
          {qty}
        </span>
      )}
      <span className={`flex w-full items-center justify-center ${big ? "h-28" : "h-16"}`} aria-hidden>
        {product.id === TOWER_ID ? (
          <DoughnutMountain className="h-28 w-28" />
        ) : product.kind === "box" ? (
          <DoughnutBox
            slots={product.size!}
            filled={product.size!}
            cols={product.size === 12 ? 4 : 3}
            lid={false}
            className={product.size === 12 ? "w-36" : "w-24"}
          />
        ) : product.kind === "unit" ? (
          <DoughnutGlyph glaze={product.glaze} sprinkles={product.id === "straw"} />
        ) : (
          <CupGlyph tall={product.id === "latte"} />
        )}
      </span>
      <span className={`font-bold leading-tight text-kk-dark ${big ? "text-base" : "text-sm"}`}>{product.name[locale]}</span>
      <span className={`font-black text-kk-green tabular-nums ${big ? "text-lg" : "text-sm"}`}>
        {fmtEuro(product.priceCents, locale)}
      </span>
    </button>
  );
}

/** Takeaway cup with the green sleeve. */
function CupGlyph({ tall }: { tall?: boolean }) {
  const top = tall ? 8 : 18;
  const side = (y: number) => 10 + (4 * (y - top)) / (60 - top); // left wall x at height y
  const s1 = top + (60 - top) * 0.35;
  const s2 = top + (60 - top) * 0.7;
  return (
    <svg viewBox="0 0 48 64" className="h-full w-auto drop-shadow-[0_3px_3px_rgba(0,50,25,0.25)]">
      <rect x="8" y={top - 5} width="32" height="6" rx="3" fill="#2b2b2b" />
      <path d={`M10 ${top} H38 L34 60 H14 Z`} fill="#fff" stroke="#e5d6c4" strokeWidth="1.5" />
      <path d={`M${side(s1)} ${s1} H${48 - side(s1)} L${48 - side(s2)} ${s2} H${side(s2)} Z`} fill="#006939" />
      <circle cx="24" cy={(s1 + s2) / 2} r="3" fill="#fff" />
    </svg>
  );
}

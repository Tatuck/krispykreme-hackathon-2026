import { redirect } from "next/navigation";
import { GIFTS } from "@/lib/gifts";
import { REFERRAL_STEP } from "@/lib/scoring";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionCustomer } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { now } from "@/lib/clock";
import { activeGifts, scoreFor } from "@/lib/loyalty";
import { STAMPS_PER_CARD, TIER_INFO, type Tier } from "@/lib/scoring";
import { fmtDate, fmtEuro, madridMonthDay } from "@/lib/format";
import { parseDiscounts, parseItems } from "@/lib/pricing";
import { getBaseUrl } from "@/lib/url";
import { GiftCard } from "@/components/GiftCard";
import { ShareBox } from "@/components/ShareBox";
import { Doughnut } from "@/components/Logo";
import { DoughnutBox } from "@/components/DoughnutBox";
import { TicketLines } from "@/components/TicketLines";
import { PreorderLines } from "@/components/PreorderLines";
import { logoutAction } from "../actions";
import { WalletPass } from "./WalletPass";
import { PreorderForm } from "./PreorderForm";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const me = await getSessionCustomer();
  if (!me) redirect("/login");
  const { t, locale } = await getT();
  const at = await now();
  const base = await getBaseUrl();

  const [gifts, history, refs, score, orders, preorders] = await Promise.all([
    activeGifts(me.id, at),
    db.query.gifts.findMany({
      where: and(eq(schema.gifts.customerId, me.id), ne(schema.gifts.status, "active")),
      orderBy: [desc(schema.gifts.createdAt)],
      limit: 6,
    }),
    db.query.referrals.findMany({ where: eq(schema.referrals.inviterId, me.id), orderBy: [desc(schema.referrals.createdAt)] }),
    scoreFor(me, at),
    db.query.tickets.findMany({
      where: eq(schema.tickets.customerId, me.id),
      orderBy: [desc(schema.tickets.createdAt)],
      limit: 20,
    }),
    db.query.preorders.findMany({
      where: eq(schema.preorders.customerId, me.id),
      orderBy: [desc(schema.preorders.pickupDate)],
      limit: 10,
    }),
  ]);
  const friends = refs.length
    ? await db.query.customers.findMany({ where: inArray(schema.customers.id, refs.map((r) => r.friendId)) })
    : [];
  const converted = refs.filter((r) => r.status === "converted").length;
  const tier = score.tier as Tier;
  const tierInfo = TIER_INFO[tier];
  const isBirthday = me.dob.slice(5) === madridMonthDay(at);
  const expiredActive = (await db.query.gifts.findMany({
    where: and(eq(schema.gifts.customerId, me.id), eq(schema.gifts.status, "active")),
  })).filter((g) => g.expiresAt <= at);

  return (
    <div>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="kk-script text-[clamp(40px,6vw,60px)] leading-none text-kk-red">
            {t.wallet.hello}, {me.name ?? me.email.split("@")[0]}
          </h1>
          <div className="flex items-center gap-4">
            <a href="#preorder" className="btn-primary">
              {t.wallet.preorder}
            </a>
            <form action={logoutAction}>
              <button className="text-sm font-bold text-kk-muted underline hover:text-kk-dark">{t.nav.logout}</button>
            </form>
          </div>
        </div>

        {isBirthday && (
          <div className="card flex flex-wrap items-baseline gap-x-5 gap-y-1 bg-kk-pink">
            <p className="kk-script text-3xl text-kk-red">{locale === "es" ? "¡Feliz cumpleaños!" : "Happy birthday!"}</p>
            <p className="font-bold text-kk-dark">{t.home.perkBirthday}</p>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <WalletPass
              name={me.name ?? me.email}
              memberCode={me.refCode}
              tierLabel={t.tiers[tier]}
              stamps={me.stamps}
            />

            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="h-display text-lg text-kk-green">{t.wallet.tier}</h2>
                <span className="chip text-white" style={{ background: tierInfo.color }}>
                  {t.tiers[tier]}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-kk-sand">
                <div className="h-full rounded-full bg-kk-green transition-all" style={{ width: `${score.total}%` }} />
              </div>
              <p className="flex justify-between gap-3 text-sm">
                <span>
                  <b className="text-kk-dark">{score.total}</b> / 100 {t.wallet.score}
                </span>
                <span>
                  {tierInfo.next ? (
                    <>
                      <b className="text-kk-dark">{tierInfo.next - score.total}</b> {t.wallet.toNext}
                    </>
                  ) : (
                    t.wallet.maxTier
                  )}
                </span>
              </p>
              <ul className="space-y-2 border-t border-kk-sand pt-3">
                {(Object.keys(TIER_INFO) as Tier[]).map((k) => (
                  <li
                    key={k}
                    className={`rounded-xl border-l-4 px-3 py-2 text-sm ${k === tier ? "bg-kk-cream" : "opacity-75"}`}
                    style={{ borderColor: TIER_INFO[k].color }}
                  >
                    <p className="flex justify-between gap-2 font-bold text-kk-dark">
                      <span>{t.tiers[k]}</span>
                      <span className="text-kk-muted">
                        {k === tier ? t.wallet.tierYou : `${TIER_INFO[k].min}+`}
                      </span>
                    </p>
                    <p>{t.wallet.tierPerks[k]}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-kk-muted">{t.wallet.tierHow}</p>
            </div>

            <div className="space-y-4">
              <h2 className="h-display text-lg text-kk-green">{t.wallet.stamps}</h2>
              <DoughnutBox slots={STAMPS_PER_CARD + 1} filled={me.stamps} cols={3} reward={t.home.free} lid={false} />
              <p className="text-sm text-kk-muted">{t.wallet.stampsHelp}</p>
            </div>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="h-display text-xl text-kk-green">{t.wallet.gifts}</h2>
              {gifts.length === 0 ? (
                <div className="rounded-[20px] border-2 border-dashed border-kk-green/25 p-6 text-center">{t.wallet.noGifts}</div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {gifts.map((g) => (
                    <GiftCard key={g.id} gift={g} showQr serverNow={at} />
                  ))}
                </div>
              )}
              {history.length + expiredActive.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm font-bold text-kk-muted hover:text-kk-dark">
                    {t.wallet.history} ({history.length + expiredActive.length})
                  </summary>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {[...expiredActive, ...history].map((g) => (
                      <GiftCard key={g.id} gift={g} muted={g.status === "used" ? t.wallet.used : t.wallet.expired} />
                    ))}
                  </div>
                </details>
              )}
            </section>

            <section id="invite" className="card scroll-mt-24 space-y-4 bg-kk-green text-white">
              <h2 className="h-display text-xl">{t.referral.title}</h2>
              <p className="text-white/90">{t.referral.body}</p>
              <ShareBox url={`${base}/r/${me.refCode}`} />
              <div>
                <p className="mb-3 text-sm font-bold text-white/85">{t.referral.ladder}</p>
                <div className="flex items-center gap-3">
                  {[0, 1, 2].map((i) =>
                    i < converted % REFERRAL_STEP ? (
                      <Doughnut key={i} className="h-14 w-14 [--hole:#006939]" />
                    ) : (
                      <span key={i} className="h-14 w-14 rounded-full border-2 border-dashed border-white/40" />
                    ),
                  )}
                  <span className="kk-script ml-auto text-2xl text-white">
                    {GIFTS[converted < REFERRAL_STEP ? "REF_HALF_DOZEN" : "REF_HALF_50"].short[locale]}
                  </span>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-white/85">
                  {t.referral.friends} ({refs.length})
                </p>
                {refs.length === 0 ? (
                  <p className="text-sm text-white/75">{t.referral.none}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {refs.map((r) => {
                      const f = friends.find((x) => x.id === r.friendId);
                      return (
                        <li key={r.id} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
                          <span className="font-bold">{f?.name ?? f?.email.split("@")[0]}</span>
                          <span className={r.status === "converted" ? "font-bold text-kk-yellow" : "text-white/70"}>
                            {r.status === "converted" ? t.referral.friendConverted : t.referral.friendPending}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            <section id="orders" className="card scroll-mt-24 space-y-4">
              <h2 className="h-display text-xl text-kk-green">{t.wallet.orders}</h2>
              {orders.length === 0 ? (
                <p className="text-sm text-kk-muted">{t.wallet.noOrders}</p>
              ) : (
                <ul className="space-y-3">
                  {orders.map((o) => (
                    <li key={o.id} className="rounded-[15px] border border-kk-green/15 p-4 text-sm">
                      <p className="mb-2 flex justify-between gap-3 text-xs text-kk-muted">
                        <span>{fmtDate(o.createdAt, locale, true)}</span>
                        <span className="font-mono">#{o.code}</span>
                      </p>
                      <TicketLines
                        boxes={o.boxes}
                        units={o.units}
                        items={parseItems(o.items)}
                        discounts={parseDiscounts(o.discounts)}
                        totalCents={o.amountCents}
                        locale={locale}
                        labels={t.staff}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {preorders.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold text-kk-muted">{t.wallet.preorders}</p>
                  <ul className="space-y-1.5">
                    {preorders.map((p) => (
                      <li key={p.id} className="flex justify-between gap-3 rounded-xl bg-kk-cream px-3 py-2 text-sm">
                        <span>
                          <PreorderLines preorder={p} labels={t.preorder.boxes} />
                          <span className="block text-xs text-kk-muted">
                            {t.preorder.occasions[p.occasion as keyof typeof t.preorder.occasions] ?? p.occasion}
                          </span>
                        </span>
                        <span className="text-right whitespace-nowrap text-kk-muted">
                          {fmtDate(Date.parse(p.pickupDate), locale)}
                          {p.totalCents > 0 && <b className="block text-kk-dark">{fmtEuro(p.totalCents, locale)}</b>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section id="preorder" className="card scroll-mt-24 space-y-4">
              <div>
                <h2 className="h-display text-xl text-kk-green">{t.preorder.title}</h2>
                <p className="mt-1">{t.preorder.subtitle}</p>
              </div>
              <PreorderForm minDate={new Date(at).toISOString().slice(0, 10)} dob={me.dob} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

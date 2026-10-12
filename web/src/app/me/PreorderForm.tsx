"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPreorderAction, type PreorderState } from "@/app/customer-actions";
import { useT } from "@/lib/i18n/client";
import { fmtEuro } from "@/lib/format";
import { publicDemo } from "@/lib/demo";
import { BIRTHDAY_MIN_BOXES } from "@/lib/gifts";
import {
  PREORDER_BOXES,
  PREORDER_MAX_BOXES,
  PREORDER_OCCASIONS,
  TOWER_ID,
  discountLabel,
  quotePreorder,
  type CartLine,
  type PreorderOccasion,
} from "@/lib/pricing";
import { DoughnutMountain } from "@/components/DoughnutMountain";
import { DoughnutGlyph } from "@/components/DoughnutGlyph";
import { OCCASION_THEME, OccasionIcon, OccasionScene } from "./OccasionScene";

const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export function PreorderForm({ minDate, dob }: { minDate: string; dob: string }) {
  const { t, locale } = useT();
  const [state, action, pending] = useActionState<PreorderState, FormData>(createPreorderAction, { ok: null });
  const [dismissed, setDismissed] = useState<PreorderState | null>(null);
  const [occasion, setOccasion] = useState<PreorderOccasion>("birthday");
  const [qty, setQty] = useState<Record<string, number>>({ "dozen-og": 1 });
  const [pickupDate, setPickupDate] = useState(minDate);

  const cart: CartLine[] = PREORDER_BOXES.filter((p) => qty[p.id]).map((p) => ({ id: p.id, qty: qty[p.id] }));
  const boxes = cart.reduce((n, l) => n + l.qty, 0);
  const birthday = dob.slice(5) === pickupDate.slice(5);
  const quote = quotePreorder(cart, { birthday });
  const total = useTween(quote?.totalCents ?? 0);
  const theme = OCCASION_THEME[occasion];

  const bump = (id: string, d: number) =>
    setQty((q) => {
      const next = Math.max(0, (q[id] ?? 0) + d);
      return boxes + d > PREORDER_MAX_BOXES && d > 0 ? q : { ...q, [id]: next };
    });

  if (state.ok && state !== dismissed) {
    const done = state.occasion ?? occasion;
    return (
      <div className="space-y-4 text-center">
        <OccasionScene key="done" occasion={done} big />
        <h3 className="h-display text-2xl" style={{ color: OCCASION_THEME[done].accent }}>
          {t.preorder.doneTitle}
        </h3>
        <p className="font-bold text-kk-dark">
          {fill(t.preorder.doneBody, { n: state.boxes ?? 0, total: fmtEuro(state.totalCents ?? 0, locale) })}
        </p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setDismissed(state);
            setQty({ "dozen-og": 1 });
          }}
        >
          {t.preorder.again}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6" style={{ ["--accent" as string]: theme.accent }}>
      <input type="hidden" name="items" value={JSON.stringify(cart)} />
      <input type="hidden" name="occasion" value={occasion} />

      <fieldset className="space-y-3">
        <legend className="label">
          <Step n={1} /> {t.preorder.stepOccasion}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PREORDER_OCCASIONS.map((o) => {
            const on = o === occasion;
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => setOccasion(o)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-black tracking-wide uppercase transition-all active:scale-95 ${
                  on ? "text-white shadow-md" : "border-kk-sand bg-white text-kk-ink hover:border-kk-green/30"
                }`}
                style={on ? { background: OCCASION_THEME[o].accent, borderColor: OCCASION_THEME[o].accent } : undefined}
              >
                <OccasionIcon occasion={o} className={`h-7 w-7 ${on ? "kk-pop" : ""}`} />
                {t.preorder.occasions[o]}
              </button>
            );
          })}
        </div>
        <OccasionScene key={occasion} occasion={occasion} tagline={t.preorder.occasionTagline[occasion]} />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">
          <Step n={2} /> {t.preorder.stepBoxes}
        </legend>
        <ul className="space-y-2">
          {PREORDER_BOXES.map((p) => {
            const n = qty[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 transition-colors ${n ? "bg-kk-cream" : "border-kk-sand bg-white"}`}
                style={n ? { borderColor: theme.accent } : undefined}
              >
                <span className="flex h-11 shrink-0 -space-x-4">
                  {p.id === TOWER_ID ? (
                    <DoughnutMountain className="h-11 w-11" />
                  ) : [0, 1, 2].map((i) => (
                    <DoughnutGlyph
                      key={i}
                      glaze={p.glaze}
                      sprinkles={p.id === "half-mix" && i === 1}
                      className={`h-11 w-11 ${i ? "hidden sm:block" : ""}`}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-tight font-bold text-kk-dark">{p.name[locale]}</span>
                  <span className="text-sm text-kk-muted">
                    {p.size} {t.preorder.doughnuts} · {fmtEuro(p.priceCents, locale)}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Stepper label="−" disabled={!n} onClick={() => bump(p.id, -1)} />
                  <span key={n} className="kk-pop inline-block w-6 text-center text-lg font-black text-kk-dark tabular-nums">
                    {n}
                  </span>
                  <Stepper label="+" accent={theme.accent} disabled={boxes >= PREORDER_MAX_BOXES} onClick={() => bump(p.id, 1)} />
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="label">
          <Step n={3} /> {t.preorder.stepPickup}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pickupDate">{t.preorder.date}</label>
            <input
              id="pickupDate"
              name="pickupDate"
              type="date"
              required
              min={minDate}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value || minDate)}
              className="input"
            />
          </div>
          {/* Free text could carry personal data: hidden on the public demo. */}
          {!publicDemo && (
            <div>
              <label className="label" htmlFor="note">{t.preorder.note}</label>
              <input id="note" name="note" maxLength={200} className="input" />
            </div>
          )}
        </div>
      </fieldset>

      <div className="space-y-2 rounded-2xl bg-kk-cream p-4">
        <p className="h-display text-sm text-kk-green">{t.preorder.summary}</p>
        {!quote ? (
          <p className="text-sm text-kk-muted">{t.preorder.empty}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {cart.map((l) => {
              const p = PREORDER_BOXES.find((b) => b.id === l.id)!;
              return (
                <li key={l.id} className="flex justify-between gap-3">
                  <span>{l.qty} × {p.name[locale]}</span>
                  <span className="tabular-nums">{fmtEuro(l.qty * p.priceCents, locale)}</span>
                </li>
              );
            })}
            {quote.discounts.map((d) => (
              <li key={d.kind} className="kk-scene-in flex justify-between gap-3 font-bold text-kk-red">
                <span>{discountLabel(d.kind, locale)}</span>
                <span className="tabular-nums">−{fmtEuro(d.cents, locale)}</span>
              </li>
            ))}
          </ul>
        )}
        {birthday && boxes < BIRTHDAY_MIN_BOXES && (
          <p className="rounded-xl bg-kk-pink/40 px-3 py-2 text-sm font-bold text-kk-red">
            {fill(t.preorder.birthdayHint, { n: BIRTHDAY_MIN_BOXES - boxes })}
          </p>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-kk-green/15 pt-2">
          <span className="h-display text-kk-dark">{t.preorder.total}</span>
          <span className="text-3xl font-black text-kk-dark tabular-nums">{fmtEuro(total, locale)}</span>
        </div>
        <p className="text-xs text-kk-muted">{t.preorder.payAtPickup}</p>
      </div>

      {state.ok === false && <p className="text-sm font-bold text-kk-red">{t.common.error}</p>}
      <button className="btn-primary w-full" disabled={pending || !quote}>
        {pending ? t.common.loading : `${t.preorder.submit} · ${fmtEuro(quote?.totalCents ?? 0, locale)}`}
      </button>
    </form>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-black text-white transition-colors">
      {n}
    </span>
  );
}

function Stepper({ label, onClick, disabled, accent }: { label: string; onClick: () => void; disabled?: boolean; accent?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "+" ? "+1" : "−1"}
      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-kk-sand bg-white text-xl leading-none font-black text-kk-dark transition-transform active:scale-90 disabled:opacity-35"
      style={accent && !disabled ? { background: accent, borderColor: accent, color: "#fff" } : undefined}
    >
      {label}
    </button>
  );
}

/** Eases a displayed number towards `target` (price counter). */
function useTween(target: number, ms = 350) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const v = Math.round(origin + (target - origin) * (1 - (1 - k) ** 3));
      from.current = v;
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

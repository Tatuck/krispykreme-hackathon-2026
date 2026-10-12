"use client";
import { useEffect, useState } from "react";
import { GIFTS, type GiftType } from "@/lib/gifts";
import { useT } from "@/lib/i18n/client";
import { fmtDate } from "@/lib/format";
import { QR } from "./QR";

/** `serverNow` = app clock at render (may be shifted by the demo time-travel). */
function Countdown({ until, serverNow }: { until: number; serverNow: number }) {
  const { t } = useT();
  const [left, setLeft] = useState(until - serverNow);
  useEffect(() => {
    const mounted = Date.now();
    const id = setInterval(() => setLeft(until - serverNow - (Date.now() - mounted)), 1000);
    return () => clearInterval(id);
  }, [until, serverNow]);
  if (left <= 0) return <span className="font-black text-kk-red">{t.wallet.expired}</span>;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="font-black text-kk-red tabular-nums">
      {t.common.expiresIn} {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function GiftCard({
  gift,
  showQr = false,
  muted,
  serverNow,
}: {
  gift: { type: string; code: string; expiresAt: number };
  showQr?: boolean;
  muted?: string;
  serverNow?: number;
}) {
  const { t, locale } = useT();
  const info = GIFTS[gift.type as GiftType];
  const color = info?.color ?? "#006939";
  // FREE_NOW lasts minutes: show a live countdown.
  const short = info && info.validMinutes <= 60;
  return (
    <div className={`overflow-hidden rounded-[20px] bg-white shadow-[0_6px_18px_-8px_rgba(0,77,42,0.25)] ${muted ? "opacity-60 grayscale" : ""}`}>
      <div className="flex">
        {/* Coupon stub: gift colour, perforated edge. */}
        <div
          className="relative flex w-24 shrink-0 items-center justify-center px-2 text-center text-white"
          style={{ background: color }}
        >
          <span className="kk-script text-xl leading-tight">{info?.short[locale]}</span>
          <span className="absolute top-0 right-0 bottom-0 w-0 border-r-[3px] border-dotted border-white/70" />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <p className="h-display text-[15px] leading-snug text-kk-dark">{info?.title[locale] ?? gift.type}</p>
          <p className="mt-1 text-sm text-kk-ink">{info?.desc[locale]}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold tracking-[0.15em] text-kk-dark">{gift.code}</span>
            {muted ? (
              <span className="chip bg-kk-sand text-kk-ink">{muted}</span>
            ) : short && serverNow !== undefined ? (
              <Countdown until={gift.expiresAt} serverNow={serverNow} />
            ) : (
              <span className="text-kk-muted">
                {t.common.validUntil} {fmtDate(gift.expiresAt, locale)}
              </span>
            )}
          </div>
        </div>
      </div>
      {showQr && !muted && (
        <div className="flex flex-col items-center gap-2 border-t-2 border-dashed border-kk-sand px-4 py-4">
          <QR value={gift.code} size={150} />
          <p className="text-sm text-kk-muted">{t.wallet.showAtCounter}</p>
        </div>
      )}
    </div>
  );
}

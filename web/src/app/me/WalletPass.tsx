"use client";
import { useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n/client";
import { QR } from "@/components/QR";
import { STAMPS_PER_CARD } from "@/lib/scoring";
import { fmtStamps } from "@/lib/format";

/** Visual mock of an Apple/Google Wallet pass. */
export function WalletPass(props: { name: string; memberCode: string; tierLabel: string; stamps: number }) {
  const { t, locale } = useT();
  const [toast, setToast] = useState(false);
  const flash = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3500);
  };
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-[20px] bg-kk-green text-white shadow-[0_20px_40px_-20px_rgba(0,77,42,0.8)]">
        <div className="flex items-center justify-between bg-white px-5 py-3">
          <Image src="/kk-logo.png" alt="Krispy Kreme" width={960} height={311} className="h-8 w-auto" />
          <span className="text-sm font-bold text-kk-green">{t.wallet.memberCard}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 pt-5 text-xs">
          <div>
            <p className="text-white/65">{t.wallet.name}</p>
            <p className="truncate text-base font-bold">{props.name}</p>
          </div>
          <div className="text-right">
            <p className="text-white/65">{t.wallet.tier}</p>
            <p className="text-base font-bold">{props.tierLabel}</p>
          </div>
          <div>
            <p className="text-white/65">{t.wallet.stamps}</p>
            <p className="text-base font-bold tabular-nums">
              {fmtStamps(props.stamps, locale)} / {STAMPS_PER_CARD}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/65">{t.common.code}</p>
            <p className="text-base font-bold tracking-[0.15em]">{props.memberCode}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 px-5 pt-4 pb-5">
          <QR value={props.memberCode} size={150} />
          <p className="mt-1 text-sm text-white/80">{t.wallet.memberHelp}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={flash} className="btn bg-black px-3 py-2.5 text-[13px] font-bold tracking-normal normal-case text-white">
          {t.wallet.addApple}
        </button>
        <button onClick={flash} className="btn bg-white px-3 py-2.5 text-[13px] font-bold tracking-normal normal-case text-kk-dark ring-1 ring-kk-dark/20">
          {t.wallet.addGoogle}
        </button>
      </div>
      {toast && <p className="rounded-2xl bg-kk-dark px-4 py-2 text-center text-xs text-white">{t.wallet.walletDemo}</p>}
    </div>
  );
}

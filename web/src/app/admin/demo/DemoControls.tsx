"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetAction, runDailyAction, seedAction, shiftClockAction } from "../actions";
import type { DailyResult } from "@/lib/loyalty";
import { useT } from "@/lib/i18n/client";

export function DemoControls({ section }: { section: "clock" | "data" }) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [daily, setDaily] = useState<DailyResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  if (section === "clock") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 7, 22, 31].map((d) => (
            <button key={d} className="btn-ghost px-4 py-2 text-xs" disabled={pending} onClick={() => act(() => shiftClockAction(d))}>
              +{d} {t.admin.addDays}
            </button>
          ))}
          <button className="btn-ghost px-4 py-2 text-xs" disabled={pending} onClick={() => act(() => shiftClockAction(0))}>
            ↺ {t.admin.resetClock}
          </button>
        </div>
        <button
          className="btn-primary w-full"
          disabled={pending}
          onClick={() => start(async () => { setDaily(await runDailyAction()); router.refresh(); })}
        >
          ▶ {t.admin.runDaily}
        </button>
        {daily && (
          <div className="rounded-xl bg-kk-cream p-3 text-sm">
            <p className="font-black">{t.admin.dailyResult}</p>
            <p>Expired gifts: {daily.expired} · Rescored: {daily.rescored}</p>
            <p>Birthday: {daily.birthdays.length ? daily.birthdays.join(", ") : "—"}</p>
            <p>Win-back: {daily.winbacks.length ? daily.winbacks.join(", ") : "—"}</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <button
        className="btn-green w-full"
        disabled={pending}
        onClick={() => start(async () => { const n = await seedAction(); setMsg(`+${n}`); router.refresh(); })}
      >
        {t.admin.seed}
      </button>
      <button
        className="btn-ghost w-full border-kk-red text-kk-red"
        disabled={pending}
        onClick={() => {
          if (window.confirm(t.admin.reset + "?")) act(resetAction);
        }}
      >
        {t.admin.reset}
      </button>
      {pending && <p className="text-sm text-kk-muted">{t.common.loading}</p>}
      {msg && <p className="text-sm font-bold text-kk-green">{msg}</p>}
    </div>
  );
}

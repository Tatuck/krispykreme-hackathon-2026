"use client";
import { useEffect, useEffectEvent, useState } from "react";
import { useT } from "@/lib/i18n/client";

/** Camera QR scanner (html5-qrcode), loaded lazily on demand. */
export function Scanner({ onResult }: { onResult: (text: string) => void }) {
  const { t } = useT();
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const emit = useEffectEvent((text: string) => onResult(text));

  useEffect(() => {
    if (!on) return;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let stopped = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (stopped) return;
      scanner = new Html5Qrcode("kk-scanner");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (text) => {
            emit(text);
            setOn(false);
          },
          () => {},
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        setOn(false);
      }
    })();
    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [on]);

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => { setErr(null); setOn((v) => !v); }} className="btn-ghost w-full">
        {on ? t.staff.stopScan : t.staff.scan}
      </button>
      {on && <div id="kk-scanner" className="overflow-hidden rounded-2xl bg-black" />}
      {err && <p className="text-xs text-kk-red">{err}</p>}
    </div>
  );
}

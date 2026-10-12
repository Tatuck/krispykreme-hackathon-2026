"use client";
import { useState, useTransition } from "react";
import { customerCampaignAction } from "../../actions";
import { useT } from "@/lib/i18n/client";

export function CampaignButtons({ customerId }: { customerId: number }) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (kind: "birthday" | "winback" | "resend") =>
    start(async () => {
      const r = await customerCampaignAction(customerId, kind);
      setMsg(`${kind}: ${r.status}${"error" in r && r.error ? ` (${r.error})` : ""}`);
    });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost px-4 py-2 text-[11px]" disabled={pending} onClick={() => run("birthday")}>{t.admin.sendBirthday}</button>
        <button className="btn-ghost px-4 py-2 text-[11px]" disabled={pending} onClick={() => run("winback")}>{t.admin.sendWinback}</button>
        <button className="btn-ghost px-4 py-2 text-[11px]" disabled={pending} onClick={() => run("resend")}>{t.admin.sendTest}</button>
      </div>
      {msg && <p className="text-xs font-bold text-kk-muted">{msg}</p>}
    </div>
  );
}

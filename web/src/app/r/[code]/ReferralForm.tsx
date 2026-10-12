"use client";
import { useActionState, useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { referralSignupAction, type ReferralState } from "@/app/customer-actions";
import { useT } from "@/lib/i18n/client";
import { FormError, SignupFields } from "@/components/SignupFields";
import { GiftCard } from "@/components/GiftCard";

export function ReferralForm({ refCode, serverNow }: { refCode: string; serverNow: number }) {
  const { t } = useT();
  const [state, action, pending] = useActionState<ReferralState, FormData>(referralSignupAction.bind(null, refCode), {
    status: "idle",
  });
  useEffect(() => {
    if (state.status === "done") confetti({ particleCount: 120, spread: 90, colors: ["#006939", "#CC112C", "#F3A3BB", "#FFCE0A"] });
  }, [state.status]);

  if (state.status === "done") {
    return (
      <div className="space-y-4 text-center">
        <p className="font-extrabold text-kk-green">{t.referral.done}</p>
        <div className="text-left">
          <GiftCard gift={state.gift} showQr serverNow={serverNow} />
        </div>
        <Link href="/me" className="btn-primary w-full">
          {t.wheel.goWallet}
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5">
      <SignupFields />
      <FormError error={state.status === "error" ? state.error : null} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.form.submit}
      </button>
    </form>
  );
}

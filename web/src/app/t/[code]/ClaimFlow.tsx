"use client";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { claimAsSessionAction, claimWithSignupAction, type ClaimState } from "@/app/customer-actions";
import { useT } from "@/lib/i18n/client";
import { Wheel } from "@/components/Wheel";
import { FormError, SignupFields } from "@/components/SignupFields";
import { GiftCard } from "@/components/GiftCard";
import { ShareBox } from "@/components/ShareBox";
import { DoughnutBox } from "@/components/DoughnutBox";
import { STAMPS_PER_CARD } from "@/lib/scoring";
import { fmtStamps } from "@/lib/format";

function burst() {
  const colors = ["#006939", "#CC112C", "#F3A3BB", "#FFCE0A", "#FFFFFF"];
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.35 }, colors });
  setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.3 }, colors }), 250);
}

export function ClaimFlow({
  ticketCode,
  known,
  willSpin,
  baseUrl,
  serverNow,
  alreadyClaimed,
}: {
  ticketCode: string;
  known: { name: string; stamps: number } | null;
  willSpin: boolean;
  baseUrl: string;
  serverNow: number;
  alreadyClaimed: boolean;
}) {
  const { t, locale } = useT();
  const [signupState, signupAction, signupPending] = useActionState<ClaimState, FormData>(
    claimWithSignupAction.bind(null, ticketCode),
    { status: "idle" },
  );
  const [sessionState, setSessionState] = useState<ClaimState>({ status: "idle" });
  const [sessionPending, startSession] = useTransition();
  const [revealed, setRevealed] = useState(false);

  const state = sessionState.status !== "idle" ? sessionState : signupState;
  const pending = signupPending || sessionPending;
  const done = state.status === "done" ? state : null;
  const target = done?.gift?.type ?? null;

  // No gift (units-only returning customer): reveal straight away.
  const showResult = done && (revealed || !done.gift);

  // Reloaded after claiming (no in-memory result): send them to the wallet.
  if (alreadyClaimed && !done) {
    return (
      <div className="card mt-6 space-y-4 text-center">
        <p className="font-bold">{t.ticket.alreadyClaimed}</p>
        <Link href="/me" className="btn-primary w-full">
          {t.wheel.goWallet}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {(done ? done.gift : willSpin) && (
        <div className={`transition ${pending ? "animate-pulse" : ""}`}>
          <Wheel
            target={target}
            onDone={() => {
              setRevealed(true);
              burst();
            }}
          />
        </div>
      )}

      {!done && (
        <div className="card">
          {known ? (
            <div className="space-y-4 text-center">
              <p className="text-lg font-extrabold text-kk-dark">
                {t.ticket.welcomeBack}, {known.name}!
              </p>
              {!willSpin && (
                <div className="space-y-3">
                  <DoughnutBox slots={STAMPS_PER_CARD + 1} filled={known.stamps} cols={3} reward={t.home.free} lid={false} className="mx-auto max-w-[220px]" />
                  <p className="text-sm text-kk-muted">{t.ticket.nextBoxSpins}</p>
                </div>
              )}
              <FormError error={state.status === "error" ? state.error : null} />
              <button
                className="btn-primary w-full text-base"
                disabled={pending}
                onClick={() => startSession(async () => setSessionState(await claimAsSessionAction(ticketCode)))}
              >
                {pending ? t.wheel.spinning : willSpin ? t.ticket.spinCta : t.ticket.addToAccount}
              </button>
            </div>
          ) : (
            <form action={signupAction} className="space-y-5">
              <SignupFields />
              <FormError error={state.status === "error" ? state.error : null} />
              <button className="btn-primary w-full text-base" disabled={pending}>
                {pending ? t.wheel.spinning : t.ticket.spinCta}
              </button>
            </form>
          )}
        </div>
      )}

      {showResult && (
        <div className="space-y-6 animate-[fadeIn_.4s_ease]">
          {done.gift ? (
            <div className="card space-y-4 text-center">
              <h2 className="kk-script text-4xl text-kk-red">{t.wheel.won}</h2>
              <div className="text-left">
                <GiftCard gift={done.gift} showQr serverNow={serverNow} />
              </div>
              {done.emailStatus === "sent" && <p className="text-sm text-kk-muted">{t.wheel.emailSent}</p>}
            </div>
          ) : (
            <div className="card text-center">
              <h2 className="h-display text-2xl text-kk-green">{t.ticket.noSpinTitle}</h2>
              <p className="mt-2">{t.ticket.noSpinBody}</p>
            </div>
          )}

          {done.guest ? (
            <p className="text-center text-sm font-bold text-kk-dark">{t.ticket.guestWallet}</p>
          ) : (
            <div className="card space-y-3 text-center">
              <h3 className="h-display text-lg text-kk-green">{t.ticket.stampsTitle}</h3>
              <DoughnutBox
                slots={STAMPS_PER_CARD + 1}
                filled={done.stamps}
                cols={3}
                reward={t.home.free}
                lid={false}
                drop
                className="mx-auto max-w-[220px]"
              />
              {!!done.summary?.stampsAdded && (
                <p className="font-bold text-kk-green">{t.ticket.stampsAdded.replace("{n}", fmtStamps(done.summary.stampsAdded, locale))}</p>
              )}
              {done.summary?.freeBoxes ? (
                <p className="font-bold text-kk-red">{t.ticket.freeBoxUnlocked}</p>
              ) : (
                <p className="text-sm text-kk-muted">{t.ticket.stampsLeft.replace("{n}", fmtStamps(STAMPS_PER_CARD - done.stamps, locale))}</p>
              )}
              {done.summary?.referralConverted && <p className="text-sm">{t.ticket.referralConverted}</p>}
              {done.activeGiftCount > 0 && (
                <p className="rounded-2xl bg-kk-cream px-4 py-3 text-sm font-bold">
                  {t.ticket.pendingGifts.replace("{n}", String(done.activeGiftCount))}
                </p>
              )}
            </div>
          )}

          {done.refCode && (
            <div className="card space-y-3 bg-kk-green text-white">
              <h3 className="h-display text-xl">{t.referral.title}</h3>
              <p className="text-white/90">{t.referral.body}</p>
              <ShareBox url={`${baseUrl}/r/${done.refCode}`} />
            </div>
          )}

          <Link href="/me" className="btn-primary w-full">
            {t.wheel.goWallet}
          </Link>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getT } from "@/lib/i18n/server";
import { normalizeCode } from "@/lib/codes";
import { now } from "@/lib/clock";
import { ReferralForm } from "./ReferralForm";

export const dynamic = "force-dynamic";

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { t } = await getT();
  const inviter = await db.query.customers.findFirst({ where: eq(schema.customers.refCode, normalizeCode(code)) });
  if (!inviter) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="h-display text-2xl text-kk-green">{t.referral.invalid}</h1>
        <p className="mt-3">{t.referral.invalidHelp}</p>
        <Link href="/" className="btn-primary mt-8">{t.nav.home}</Link>
      </div>
    );
  }
  const who = inviter.name ?? inviter.email.split("@")[0];
  return (
    <div className="min-h-[80vh]">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card overflow-hidden p-0 text-center">
          <div className="bg-kk-green px-6 pt-8 pb-10 text-white">
            <p className="text-lg font-bold">
              {who} {t.referral.landingTitle}
            </p>
            <p className="kk-script mt-1 text-[88px] leading-none">20%</p>
            <p className="h-display text-lg tracking-[0.08em]">{t.referral.landingOff}</p>
            <p className="mx-auto mt-4 max-w-[30ch] text-white/90">{t.referral.landingSubtitle}</p>
          </div>
          <div className="p-6 text-left">
            <ReferralForm refCode={inviter.refCode} serverNow={await now()} />
          </div>
        </div>
      </div>
    </div>
  );
}

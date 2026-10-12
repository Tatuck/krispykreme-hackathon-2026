"use client";
import { useT } from "@/lib/i18n/client";

export function SignupFields() {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="email">{t.form.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="tu@email.com" />
      </div>
      <div>
        <label className="label" htmlFor="name">{t.form.name}</label>
        <input id="name" name="name" autoComplete="given-name" className="input" maxLength={60} />
      </div>
      <div>
        <label className="label" htmlFor="dob">{t.form.dob}</label>
        <input id="dob" name="dob" type="date" required className="input" max={new Date().toISOString().slice(0, 10)} />
        <p className="mt-1 ml-2 text-xs text-kk-muted">{t.form.dobHelp}</p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 accent-kk-green" />
        <span>{t.form.terms}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="marketing" defaultChecked className="mt-0.5 h-5 w-5 accent-kk-green" />
        <span>{t.form.marketing}</span>
      </label>
    </div>
  );
}

export function FormError({ error }: { error: string | null }) {
  const { t } = useT();
  if (!error) return null;
  const map: Record<string, string> = {
    tooYoung: t.form.tooYoung,
    dobMismatch: t.form.dobMismatch,
    invalid: t.form.invalid,
    termsRequired: t.form.termsRequired,
    alreadyCustomer: t.referral.alreadyCustomer,
    selfReferral: t.referral.selfReferral,
    notFound: t.ticket.notFound,
    alreadyClaimed: t.ticket.alreadyClaimed,
  };
  return (
    <p role="alert" className="rounded-2xl bg-kk-red/10 px-4 py-3 text-sm font-bold text-kk-red">
      {map[error] ?? t.common.error}
    </p>
  );
}

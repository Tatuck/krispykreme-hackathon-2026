"use client";
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/client";
import { makeFakeProfile, publicDemo } from "@/lib/demo";

const noopSubscribe = () => () => {};

/** Public demo: locked, client-generated fake profile (after hydration, so server and client HTML match). */
function useFakeProfile() {
  const [profile] = useState(makeFakeProfile);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!publicDemo) return null;
  return mounted ? profile : { name: "", email: "", dob: "" };
}

export function SignupFields() {
  const { t } = useT();
  const fake = useFakeProfile();
  const inputClass = fake ? "input bg-kk-cream text-kk-muted" : "input";
  return (
    <div className="space-y-4">
      {fake && (
        <p className="rounded-2xl bg-kk-green-light px-4 py-3 text-sm font-bold text-kk-green">{t.form.demoNotice}</p>
      )}
      <div>
        <label className="label" htmlFor="email">{t.form.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete={fake ? "off" : "email"}
          className={inputClass}
          placeholder="tu@email.com"
          readOnly={!!fake}
          key={fake?.email}
          defaultValue={fake?.email}
        />
      </div>
      <div>
        <label className="label" htmlFor="name">{t.form.name}</label>
        <input
          id="name"
          name="name"
          autoComplete={fake ? "off" : "given-name"}
          className={inputClass}
          maxLength={60}
          readOnly={!!fake}
          key={fake?.name}
          defaultValue={fake?.name}
        />
      </div>
      <div>
        <label className="label" htmlFor="dob">{t.form.dob}</label>
        <input
          id="dob"
          name="dob"
          type="date"
          required
          className={inputClass}
          max={new Date().toISOString().slice(0, 10)}
          readOnly={!!fake}
          key={fake?.dob}
          defaultValue={fake?.dob}
        />
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
    demoEmail: t.form.demoEmail,
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

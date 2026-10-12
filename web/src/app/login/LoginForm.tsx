"use client";
import { useActionState } from "react";
import { requestMagicLinkAction, type LoginState } from "@/app/customer-actions";
import { useT } from "@/lib/i18n/client";

export function LoginForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState<LoginState, FormData>(requestMagicLinkAction, { status: "idle" });
  if (state.status === "sent") {
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-kk-green-light px-4 py-3 font-bold text-kk-green">{t.wallet.loginSent}</p>
        {state.demoLink && (
          <a href={state.demoLink} className="btn-ghost w-full">
            {t.wallet.loginDemoLink}
          </a>
        )}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4 text-left">
      <label className="label" htmlFor="email">{t.form.email}</label>
      <input id="email" name="email" type="email" required className="input" placeholder="tu@email.com" />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? t.common.loading : t.wallet.loginSend}
      </button>
    </form>
  );
}

"use client";
import { useActionState } from "react";
import { staffLoginAction } from "../actions";
import { useT } from "@/lib/i18n/client";

export function PinForm({ next }: { next: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(staffLoginAction, { error: false });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        autoFocus
        required
        placeholder={t.staff.pin}
        className="input text-center text-2xl tracking-[0.5em]"
      />
      {state.error && <p className="text-sm font-bold text-kk-red">{t.staff.wrongPin}</p>}
      <button className="btn-green w-full" disabled={pending}>
        {t.staff.enter}
      </button>
    </form>
  );
}

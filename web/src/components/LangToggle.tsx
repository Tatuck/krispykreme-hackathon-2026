"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions";
import { useT } from "@/lib/i18n/client";

export function LangToggle() {
  const { locale } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex rounded-full border-2 border-white/60 p-0.5 text-xs font-black" aria-label="Language">
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={`rounded-full px-2.5 py-1 uppercase transition ${
            locale === l ? "bg-white text-kk-green" : "text-white hover:bg-white/15"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

export function ShareBox({ url }: { url: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${t.referral.shareText} ${url}`)}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-1.5 pl-5">
        <span className="min-w-0 flex-1 truncate text-[15px] text-kk-dark">{url.replace(/^https?:\/\//, "")}</span>
        <button
          type="button"
          className="btn-green px-4 py-2 text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? t.common.copied : t.common.copy}
        </button>
      </div>
      <a href={wa} target="_blank" rel="noreferrer" className="btn-pill w-full text-[#128C7E]">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
          <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .3-3.4-.7-2.8-1.2-4.6-4.1-4.8-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.7-.2 1.3z" />
        </svg>
        {t.referral.share}
      </a>
    </div>
  );
}

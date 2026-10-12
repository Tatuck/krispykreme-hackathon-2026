import Image from "next/image";
import { useId } from "react";

export function Logo({ className = "h-10 w-auto" }: { className?: string }) {
  return <Image src="/kk-logo.png" alt="Krispy Kreme" width={960} height={311} className={className} priority />;
}

/** Original Glazed, seen from above: amber dough, glossy glaze, a hole. */
export function Doughnut({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id={`d${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="28%" stopColor="#9c5a1c" />
          <stop offset="42%" stopColor="#d18a3c" />
          <stop offset="70%" stopColor="#e7a957" />
          <stop offset="92%" stopColor="#c47a2e" />
          <stop offset="100%" stopColor="#9c5a1c" />
        </radialGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#d${id})`} />
      <path d="M14 22a21 21 0 0121-12" stroke={`url(#g${id})`} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M44 48a19 19 0 006-6" stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="32" r="8.5" fill="var(--hole, #FDF4EB)" />
    </svg>
  );
}

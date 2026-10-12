"use client";
import { useEffect, useEffectEvent } from "react";
import { GIFTS, WHEEL_GIFT_TYPES } from "@/lib/gifts";
import { useT } from "@/lib/i18n/client";

const SEG = 360 / WHEEL_GIFT_TYPES.length;
const FILLS = ["#006939", "#FDF4EB", "#CC112C", "#FDF4EB", "#004D2A", "#F3A3BB"];
const INKS = ["#FFFFFF", "#006939", "#FFFFFF", "#CC112C", "#FFFFFF", "#2B2B2B"];

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  // Rounded so server and client render identical attributes (no hydration mismatch).
  return [Math.round((100 + r * Math.cos(a)) * 100) / 100, Math.round((100 + r * Math.sin(a)) * 100) / 100];
}

function targetRotation(target: string) {
  const i = Math.max(0, WHEEL_GIFT_TYPES.indexOf(target as (typeof WHEEL_GIFT_TYPES)[number]));
  const hash = [...target].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);
  const jitter = ((hash % 100) / 100 - 0.5) * (SEG * 0.6);
  return 360 * 6 - (i * SEG + SEG / 2) + jitter;
}

/** Spins to `target` (a wheel gift type) when it becomes non-null, then calls onDone. */
export function Wheel({ target, onDone }: { target: string | null; onDone?: () => void }) {
  const { locale } = useT();
  const finish = useEffectEvent(() => onDone?.());
  // Pure: final angle derived from the target (small deterministic jitter per gift).
  const rotation = target ? targetRotation(target) : 0;

  useEffect(() => {
    if (!target) return;
    const id = setTimeout(finish, 4700);
    return () => clearTimeout(id);
  }, [target]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      {/* pointer */}
      <div className="absolute top-[-6px] left-1/2 z-10 -translate-x-1/2">
        <svg width="36" height="44" viewBox="0 0 36 44" aria-hidden>
          <path d="M18 44L2 10a16 16 0 1132 0z" fill="#CC112C" stroke="#fff" strokeWidth="3" />
          <circle cx="18" cy="15" r="5" fill="#fff" />
        </svg>
      </div>
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full drop-shadow-[0_12px_20px_rgba(0,77,42,0.35)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: target ? "transform 4.5s cubic-bezier(0.17, 0.85, 0.2, 1)" : undefined,
        }}
      >
        <circle cx="100" cy="100" r="99" fill="#006939" />
        {WHEEL_GIFT_TYPES.map((type, i) => {
          const [x1, y1] = polar(92, i * SEG);
          const [x2, y2] = polar(92, (i + 1) * SEG);
          const mid = i * SEG + SEG / 2;
          const [tx, ty] = polar(62, mid);
          return (
            <g key={type}>
              <path d={`M100 100 L${x1} ${y1} A92 92 0 0 1 ${x2} ${y2} Z`} fill={FILLS[i]} stroke="#fff" strokeWidth="1.5" />
              <text
                x={tx}
                y={ty}
                fill={INKS[i]}
                fontSize="7"
                fontWeight="900"
                letterSpacing="0.4"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${mid} ${tx} ${ty})`}
                style={{ textTransform: "uppercase", fontFamily: "var(--font-jost)" }}
              >
                {GIFTS[type].short[locale]}
              </text>
            </g>
          );
        })}
        {Array.from({ length: 24 }).map((_, i) => {
          const [x, y] = polar(96, i * 15);
          return <circle key={i} cx={x} cy={y} r="1.6" fill={i % 2 ? "#FFCE0A" : "#fff"} />;
        })}
        <circle cx="100" cy="100" r="24" fill="#fff" />
        <circle cx="100" cy="100" r="20" fill="#d18a3c" />
        <circle cx="100" cy="100" r="15" fill="none" stroke="#e7a957" strokeWidth="6" />
        <path d="M88 92a14 14 0 0110-7" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="100" cy="100" r="6" fill="#FDF4EB" />
      </svg>
    </div>
  );
}

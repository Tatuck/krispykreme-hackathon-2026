import type { PreorderOccasion } from "@/lib/pricing";
import { DoughnutGlyph } from "@/components/DoughnutGlyph";
import { DoughnutMountain } from "@/components/DoughnutMountain";

/** Accent color and banner background per occasion (brand tokens). */
export const OCCASION_THEME: Record<PreorderOccasion, { accent: string; bg: string }> = {
  birthday: { accent: "#cc112c", bg: "#fbe3ea" },
  office: { accent: "#006939", bg: "#e6f0ea" },
  party: { accent: "#d48233", bg: "#fdf0dc" },
  other: { accent: "#9c5a1c", bg: "#f6e9db" },
};

const CONFETTI_COLORS = ["#cc112c", "#ffce0a", "#006939", "#3a7ca5", "#f3a3bb"];
// Fixed positions (no randomness in render: server and client must match).
const CONFETTI = [4, 11, 19, 26, 33, 41, 48, 57, 64, 72, 79, 86, 93].map((left, i) => ({
  left,
  delay: (i * 370) % 2400,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
}));
const BALLOONS = [
  { left: 8, color: "#cc112c", delay: 0, size: 34 },
  { left: 24, color: "#ffce0a", delay: 1400, size: 28 },
  { left: 70, color: "#3a7ca5", delay: 700, size: 32 },
  { left: 86, color: "#006939", delay: 2100, size: 26 },
];

/**
 * Animated banner for the chosen occasion. Remount it (`key`) to replay the entrance;
 * `big` is the taller celebration used on the confirmation screen.
 */
export function OccasionScene({
  occasion,
  tagline,
  big = false,
}: {
  occasion: PreorderOccasion;
  tagline?: string;
  big?: boolean;
}) {
  const theme = OCCASION_THEME[occasion];
  return (
    <div
      className={`relative flex items-center gap-4 overflow-hidden rounded-[16px] px-5 ${big ? "h-44 justify-center" : "h-28"}`}
      style={{ background: theme.bg }}
      aria-hidden={!tagline}
    >
      {(occasion === "birthday" || big) &&
        CONFETTI.map((c, i) => (
          <span
            key={i}
            className={`kk-confetti absolute -top-3 h-2.5 ${c.round ? "w-2.5 rounded-full" : "w-1.5 rounded-sm"}`}
            style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}ms` }}
          />
        ))}
      {occasion === "party" &&
        BALLOONS.map((b, i) => (
          <span
            key={i}
            className="kk-float-up absolute bottom-0"
            style={{ left: `${b.left}%`, animationDelay: `${b.delay}ms` }}
          >
            <Balloon color={b.color} size={b.size} />
          </span>
        ))}

      <div className={`kk-scene-in relative shrink-0 ${big ? "h-28 w-28" : "h-20 w-20"}`}>
        {occasion === "birthday" && <DoughnutMountain />}
        {occasion === "office" && <Coffee />}
        {occasion === "party" && <PartyBox />}
        {occasion === "other" && (
          <span className="kk-spin block h-full w-full">
            <DoughnutGlyph glaze="#f29bb5" sprinkles className="h-full w-full" />
          </span>
        )}
      </div>
      {tagline && !big && (
        <p className="kk-script relative text-xl leading-tight sm:text-2xl" style={{ color: theme.accent }}>
          {tagline}
        </p>
      )}
    </div>
  );
}

/** Small icon for the occasion picker. */
export function OccasionIcon({ occasion, className = "h-7 w-7" }: { occasion: PreorderOccasion; className?: string }) {
  const common = { className, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (occasion) {
    case "birthday":
      return (
        <svg {...common} aria-hidden>
          <path d="M6 28V17h20v11M4 28h24M6 21c3 2 5-2 8 0s5 2 8 0 3-1 4 0M11 17v-4M16 17v-4M21 17v-4" />
          <path d="M11 9.5c-.8-1 .2-2.5 0-3.5 1 .8 1.3 2.6 0 3.5zM16 9.5c-.8-1 .2-2.5 0-3.5 1 .8 1.3 2.6 0 3.5zM21 9.5c-.8-1 .2-2.5 0-3.5 1 .8 1.3 2.6 0 3.5z" />
        </svg>
      );
    case "office":
      return (
        <svg {...common} aria-hidden>
          <path d="M6 13h16v8a6 6 0 01-6 6h-4a6 6 0 01-6-6v-8zM22 15h2a3 3 0 010 6h-2M11 4v4M15 3v5M19 4v4" />
        </svg>
      );
    case "party":
      return (
        <svg {...common} aria-hidden>
          <path d="M16 4c4.4 0 7 3.4 7 7.5S19.5 20 16 20s-7-4.4-7-8.5S11.6 4 16 4zM16 20l-1.5 2h3L16 20M16 22c0 3-3 3-3 6" />
        </svg>
      );
    case "other":
      return (
        <svg {...common} aria-hidden>
          <circle cx="16" cy="16" r="12" />
          <circle cx="16" cy="16" r="4" />
          <path d="M10 10l1.5 1M21 9l-1 1.5M23 19l-1.5-.5M12 22l1-1.4" />
        </svg>
      );
  }
}

function Coffee() {
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full">
      {[30, 40, 50].map((x, i) => (
        <path
          key={x}
          className="kk-steam"
          style={{ animationDelay: `${i * 500}ms` }}
          d={`M${x} 30c-4-4 4-7 0-12`}
          stroke="#7a7068"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <path d="M16 34h48l-5 36H21z" fill="#fff" stroke="#e5d6c4" strokeWidth="2" />
      <rect x="13" y="29" width="54" height="7" rx="3.5" fill="#2b2b2b" />
      <path d="M18.5 46h43l-1.6 12H20.1z" fill="#006939" />
      <circle cx="40" cy="52" r="3.5" fill="#fff" />
      <g className="kk-bob" style={{ transformBox: "fill-box" }}>
        <circle cx="66" cy="62" r="11" fill="#d39147" />
        <circle cx="66" cy="62" r="9" fill="#5a3320" />
        <circle cx="66" cy="62" r="3.2" fill="#e6f0ea" />
      </g>
    </svg>
  );
}

function PartyBox() {
  return (
    <svg viewBox="0 0 80 80" className="kk-bob h-full w-full drop-shadow-[0_4px_4px_rgba(0,50,25,0.25)]">
      <path d="M8 36l6-12h52l6 12z" fill="#fff" stroke="#e5d6c4" strokeWidth="2" />
      <rect x="8" y="36" width="64" height="34" rx="4" fill="#fff" stroke="#e5d6c4" strokeWidth="2" />
      <rect x="8" y="36" width="64" height="7" fill="#006939" />
      {[22, 40, 58].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="56" r="8" fill="#d39147" />
          <circle cx={x} cy="56" r="6.5" fill={["#e7a957", "#f29bb5", "#5a3320"][i]} />
          <circle cx={x} cy="56" r="2.3" fill="#fff" />
        </g>
      ))}
    </svg>
  );
}

function Balloon({ color, size }: { color: string; size: number }) {
  return (
    <svg viewBox="0 0 30 48" width={size} height={size * 1.6} aria-hidden>
      <ellipse cx="15" cy="14" rx="12" ry="14" fill={color} />
      <path d="M9 7a8 8 0 016-3" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M13 28h4l-2 3z" fill={color} />
      <path d="M15 31c-3 5 3 8 0 15" stroke="#7a7068" strokeWidth="1" fill="none" />
    </svg>
  );
}

import { useId } from "react";

/** Madrid line-art skyline strip (Puerta de Alcalá, Metrópolis, towers), like the krispykreme.es divider. */
export function Skyline({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`block h-14 w-full ${className}`} aria-hidden preserveAspectRatio="none">
      <defs>
        <pattern id={`sk${id}`} width="200" height="56" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#006939" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
            <path d="M0 55.3H200" />
            {/* Puerta de Alcalá */}
            <path d="M4 55V30h60v25M20 30v-8h28v8M30 22l4-5 4 5" />
            <path d="M10 55v-9a4 4 0 018 0v9M28 55v-12a6 6 0 0112 0v12M50 55v-9a4 4 0 018 0v9" />
            {/* Metrópolis */}
            <path d="M78 55V27h22v28M80 27c0-9 4-14 9-14s9 5 9 14M89 13V5M86 8h6M82 34h14M82 42h14" />
            {/* Tree */}
            <circle cx="113" cy="45" r="6" />
            <path d="M113 51v4" />
            {/* Tower */}
            <path d="M124 55V7h16v48M124 15h16M124 23h16M124 31h16M124 39h16M124 47h16" />
            {/* Palace */}
            <path d="M148 55V36h48v19M146 36l26-10 26 10M156 40v15M164 40v15M172 40v15M180 40v15M188 40v15" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="56" fill={`url(#sk${id})`} />
    </svg>
  );
}

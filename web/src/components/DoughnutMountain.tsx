/**
 * Birthday "cake" made of doughnuts: rows stacked into a mountain with a candle on top.
 * Fixed layout (no randomness): renders identically on server and client.
 */
const GLAZES = ["#e7a957", "#f29bb5", "#5a3320", "#e7a957", "#f3a3bb", "#b8742f"];
const ROWS = [5, 4, 3]; // 12 doughnuts

export function DoughnutMountain({ candle = true, className = "h-full w-full" }: { candle?: boolean; className?: string }) {
  const r = 8;
  return (
    <svg viewBox="0 0 80 80" className={`${className} drop-shadow-[0_4px_4px_rgba(120,20,40,0.25)]`} aria-hidden>
      <rect x="2" y="70" width="76" height="5" rx="2.5" fill="#fff" />
      {ROWS.map((n, row) => {
        const y = 64 - row * 13;
        const x0 = 40 - (n - 1) * r;
        return Array.from({ length: n }, (_, i) => {
          const x = x0 + i * 2 * r;
          return (
            <g key={`${row}-${i}`}>
              <circle cx={x} cy={y} r={r} fill="#d39147" />
              <circle cx={x} cy={y} r={r - 1.6} fill={GLAZES[(row * 2 + i) % GLAZES.length]} />
              <circle cx={x} cy={y} r={2.5} fill="#fdf4eb" />
            </g>
          );
        });
      })}
      {candle && (
        <g>
          <rect x="38" y="20" width="4" height="11" rx="1.2" fill="#ffce0a" />
          <path className="kk-flicker" d="M40 9c-3.5 4.5-3.5 7.5 0 9.5 3.5-1 3.5-5 0-9.5z" fill="#ffb21a" />
        </g>
      )}
    </svg>
  );
}

/** Doughnut seen from above with its icing color. */
export function DoughnutGlyph({
  glaze,
  sprinkles,
  className = "h-full w-auto",
}: {
  glaze: string;
  sprinkles?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={`${className} drop-shadow-[0_3px_3px_rgba(90,50,10,0.3)]`}>
      <circle cx="32" cy="32" r="29" fill="#d39147" />
      <circle cx="32" cy="32" r="24" fill={glaze} />
      <path d="M17 22a18 18 0 0118-10" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" fill="none" />
      {sprinkles &&
        [
          [20, 30, 20], [26, 18, -30], [40, 16, 60], [46, 28, 10], [44, 42, -50], [30, 47, 30], [19, 41, 80], [36, 22, 0],
        ].map(([x, y, r], i) => (
          <rect key={i} x={x} y={y} width="5" height="1.8" rx="0.9" transform={`rotate(${r} ${x} ${y})`} fill={["#fff", "#ffce0a", "#3a7ca5", "#006939"][i % 4]} />
        ))}
      <circle cx="32" cy="32" r="8.5" fill="#fff" />
    </svg>
  );
}

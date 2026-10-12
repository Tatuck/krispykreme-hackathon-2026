// Branded invite QR: rounded-square green modules (circles decode poorly), red finder eyes and a glazed doughnut in the middle.
// Usage: node scripts/invite-qr.mjs <url> <out.svg>
import { writeFileSync } from "node:fs";
import QRCode from "qrcode";

const [url, out] = process.argv.slice(2);
if (!url || !out) throw new Error("usage: node scripts/invite-qr.mjs <url> <out.svg>");

const GREEN = "#006939";
const RED = "#cc112c";
const CREAM = "#fdf4eb";

// Level H tolerates ~30% damage, so the centre can be covered by the doughnut.
const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
const n = qr.modules.size;
const cell = 10;
const quiet = 4 * cell;
const size = n * cell + quiet * 2;
const mid = size / 2;
const holeR = n * cell * 0.13; // cleared radius behind the doughnut

const isFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

const dots = [];
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (!qr.modules.get(r, c) || isFinder(r, c)) continue;
    const x = quiet + c * cell + cell / 2;
    const y = quiet + r * cell + cell / 2;
    if (Math.hypot(x - mid, y - mid) < holeR + cell * 0.8) continue;
    dots.push(`<rect x="${x - cell / 2}" y="${y - cell / 2}" width="${cell}" height="${cell}" rx="${cell * 0.35}"/>`);
  }
}

const eye = (r, c) => {
  const x = quiet + c * cell;
  const y = quiet + r * cell;
  return `
  <rect x="${x + cell / 2}" y="${y + cell / 2}" width="${cell * 6}" height="${cell * 6}" rx="${cell * 1.8}" fill="none" stroke="${GREEN}" stroke-width="${cell}"/>
  <rect x="${x + cell * 2}" y="${y + cell * 2}" width="${cell * 3}" height="${cell * 3}" rx="${cell}" fill="${RED}"/>`;
};

const d = holeR * 0.92; // doughnut outer radius
const sprinkles = [
  [-0.55, -0.35, 30, "#f6c945"], [0.5, -0.45, -20, "#ffffff"], [0.62, 0.25, 60, "#3d7dd8"],
  [-0.2, 0.62, -50, "#ffffff"], [-0.65, 0.2, 80, "#3d7dd8"], [0.15, -0.68, 10, "#f6c945"],
  [0.35, 0.6, 35, "#f6c945"],
]
  .map(([dx, dy, rot, color]) => {
    const x = mid + dx * d * 0.78;
    const y = mid + dy * d * 0.78;
    return `<rect x="${x - d * 0.09}" y="${y - d * 0.03}" width="${d * 0.18}" height="${d * 0.06}" rx="${d * 0.03}" fill="${color}" transform="rotate(${rot} ${x} ${y})"/>`;
  })
  .join("");

// Glaze covers the whole ring with a soft wavy edge (12 bumps).
const glaze =
  Array.from({ length: 121 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2;
    const r = d * (0.82 + 0.05 * Math.sin(a * 12));
    return `${i ? "L" : "M"} ${(mid + r * Math.cos(a)).toFixed(2)} ${(mid + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ") + " Z";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 2}" height="${size * 2}">
  <rect width="${size}" height="${size}" rx="${cell * 3}" fill="${CREAM}"/>
  <g fill="${GREEN}">${dots.join("")}</g>
  ${eye(0, 0)}${eye(0, n - 7)}${eye(n - 7, 0)}
  <circle cx="${mid}" cy="${mid}" r="${holeR}" fill="${CREAM}"/>
  <circle cx="${mid}" cy="${mid + d * 0.08}" r="${d}" fill="#000" opacity="0.08"/>
  <circle cx="${mid}" cy="${mid}" r="${d}" fill="#d4934a"/>
  <path d="${glaze}" fill="#f3a6c0"/>
  ${sprinkles}
  <circle cx="${mid}" cy="${mid}" r="${d * 0.3}" fill="${CREAM}" stroke="#c07f3a" stroke-width="${d * 0.05}"/>
</svg>
`;

writeFileSync(out, svg);
console.log(`${out}: ${n}x${n} modules, ${url}`);

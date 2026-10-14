/**
 * Public demo mode (NEXT_PUBLIC_DEMO_MODE=1): sign-up only accepts fictitious addresses so visitors
 * never store a real email in the shared database. Their emails are rendered and logged (Admin →
 * Emails) but never sent. DEMO_EMAIL_ALLOWLIST (server-only, comma-separated) lets the team use
 * their own inboxes during the live pitch.
 */
export const DEMO_EMAIL_DOMAIN = "example.com";

export const REPO_URL = "https://github.com/Tatuck/krispykreme-hackathon-2026";

export const publicDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

export function isAllowedSignupEmail(email: string, allowlist = process.env.DEMO_EMAIL_ALLOWLIST ?? ""): boolean {
  if (isDemoEmail(email)) return true;
  const normalized = email.trim().toLowerCase();
  return allowlist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .some((e) => e && e === normalized);
}

const FAKE_NAMES = [
  "Lucía", "Hugo", "Martina", "Mateo", "Sofía", "Leo", "Valeria", "Daniel", "Paula", "Pablo",
  "Julia", "Álvaro", "Carmen", "Diego", "Elena", "Marcos", "Irene", "Adrián", "Noa", "Javier",
];

export type FakeProfile = { name: string; email: string; dob: string };

/** Random adult profile for the public demo; the random suffix keeps emails unique per visitor. */
export function makeFakeProfile(rand: () => number = Math.random): FakeProfile {
  const name = FAKE_NAMES[Math.floor(rand() * FAKE_NAMES.length)];
  const slug = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const suffix = Math.floor(rand() * 36 ** 6).toString(36).padStart(6, "0");
  const year = 1970 + Math.floor(rand() * 35);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const dob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { name, email: `${slug}.${suffix}@${DEMO_EMAIL_DOMAIN}`, dob };
}

export type StaffRole = "staff" | "owner";

/**
 * The staff PIN is public (it's in the README) and opens the kiosk and admin. ADMIN_PIN is secret
 * and also unlocks destructive actions (wiping the database) on the public demo.
 */
export function pinRole(pin: string, staffPin: string, adminPin = ""): StaffRole | null {
  if (adminPin && safeEqual(pin, adminPin)) return "owner";
  if (safeEqual(pin, staffPin)) return "staff";
  return null;
}

// Constant-time for equal lengths; PIN length isn't a secret worth hiding.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

import type { Locale } from "./gifts";

export function fmtDate(ms: number, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Madrid",
  }).format(ms);
}

export function fmtEuro(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Stamp card progress: a half dozen stamps half, so "2,5". */
export function fmtStamps(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", { maximumFractionDigits: 1 }).format(n);
}

export function ageOn(dob: string, at: number): number {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date(at);
  let age = now.getUTCFullYear() - y;
  const md = (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  if (md < m * 100 + d) age--;
  return age;
}

/** Month-day key in Madrid time, e.g. "10-09". */
export function madridMonthDay(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ms);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("month")}-${get("day")}`;
}

export function madridYear(ms: number): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric" }).format(ms));
}

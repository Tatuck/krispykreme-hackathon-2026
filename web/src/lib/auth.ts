import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getBaseUrl } from "./url";

const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret";
const CUSTOMER_COOKIE = "kk_session";
const STAFF_COOKIE = "kk_staff";
const CLAIM_COOKIE = "kk_claim";

type Payload = { sub: string; exp: number; kind: "session" | "magic" | "staff" | "claim" };

function b64(s: string) {
  return Buffer.from(s).toString("base64url");
}

function sign(payload: Payload): string {
  const body = b64(JSON.stringify(payload));
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string | undefined, kind: Payload["kind"]): Payload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (p.kind !== kind || p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

const DAY = 24 * 60 * 60 * 1000;

// Secure cookies only when actually served over HTTPS (plain-HTTP access via a Tailscale/LAN IP must still work).
async function secureCookies() {
  return (await getBaseUrl()).startsWith("https://");
}

export function createMagicToken(customerId: number): string {
  return sign({ sub: String(customerId), exp: Date.now() + 7 * DAY, kind: "magic" });
}

export function verifyMagicToken(token: string): number | null {
  const p = verify(token, "magic");
  return p ? Number(p.sub) : null;
}

export async function setCustomerSession(customerId: number) {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, sign({ sub: String(customerId), exp: Date.now() + 30 * DAY, kind: "session" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookies(),
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

/**
 * Marks that this browser just claimed `ticketCode` without logging in (existing account
 * matched by email + date of birth). Lets /t/[code] keep showing the spin result after the
 * server action refresh, without granting access to the account.
 */
export async function markTicketClaimed(ticketCode: string) {
  (await cookies()).set(CLAIM_COOKIE, sign({ sub: ticketCode, exp: Date.now() + 60 * 60 * 1000, kind: "claim" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookies(),
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function claimedInThisBrowser(ticketCode: string): Promise<boolean> {
  return verify((await cookies()).get(CLAIM_COOKIE)?.value, "claim")?.sub === ticketCode;
}

export async function clearCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getSessionCustomerId(): Promise<number | null> {
  const p = verify((await cookies()).get(CUSTOMER_COOKIE)?.value, "session");
  return p ? Number(p.sub) : null;
}

export async function getSessionCustomer() {
  const id = await getSessionCustomerId();
  if (!id) return null;
  return (await db.query.customers.findFirst({ where: eq(schema.customers.id, id) })) ?? null;
}

export function checkStaffPin(pin: string): boolean {
  const expected = Buffer.from(process.env.STAFF_PIN || "1234");
  const given = Buffer.from(pin);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function setStaffSession() {
  (await cookies()).set(STAFF_COOKIE, sign({ sub: "staff", exp: Date.now() + 1 * DAY, kind: "staff" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookies(),
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

export async function clearStaffSession() {
  (await cookies()).delete(STAFF_COOKIE);
}

export async function isStaff(): Promise<boolean> {
  return verify((await cookies()).get(STAFF_COOKIE)?.value, "staff") !== null;
}

export async function requireStaff() {
  if (!(await isStaff())) redirect("/staff/login");
}

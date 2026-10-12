import "server-only";
import { headers } from "next/headers";

/** Absolute base URL for QR codes and emails. Uses the request host so LAN/ngrok demos work. */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    // outside a request (scripts)
  }
  return "http://localhost:3000";
}

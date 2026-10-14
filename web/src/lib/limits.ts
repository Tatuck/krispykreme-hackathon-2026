import "server-only";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import { publicDemo } from "./demo";

/**
 * Size caps for the public demo, so strangers can't grow the shared database (and the Turso bill:
 * the admin dashboard reads every row). Over a cap, new rows are refused; the daily cron wipes and
 * reseeds a full database. Local runs (no NEXT_PUBLIC_DEMO_MODE) are unlimited.
 */
const CAPS = {
  customers: Number(process.env.DEMO_MAX_CUSTOMERS) || 500,
  tickets: Number(process.env.DEMO_MAX_TICKETS) || 3000,
  emails: Number(process.env.DEMO_MAX_EMAILS) || 5000,
  preorders: Number(process.env.DEMO_MAX_PREORDERS) || 500,
};

export type CappedTable = keyof typeof CAPS;

// A full table stays full until the nightly reset: remembering it spares a COUNT(*) (one row read
// per row in Turso) on every refused request.
const FULL_CACHE_MS = 60_000;
const fullUntil: Partial<Record<CappedTable, number>> = {};

async function rows(table: CappedTable): Promise<number> {
  const [r] = await db.select({ n: count() }).from(schema[table]);
  return r?.n ?? 0;
}

/** Whether `extra` more rows fit in `table`. Always true outside the public demo. */
export async function hasRoom(table: CappedTable, extra = 1): Promise<boolean> {
  if (!publicDemo) return true;
  if ((fullUntil[table] ?? 0) > Date.now()) return false;
  const ok = (await rows(table)) + extra <= CAPS[table];
  if (!ok && extra === 1) fullUntil[table] = Date.now() + FULL_CACHE_MS;
  return ok;
}

/** Some capped table has no room left (the cron then resets the demo). */
export async function isDbFull(): Promise<boolean> {
  if (!publicDemo) return false;
  for (const table of Object.keys(CAPS) as CappedTable[]) {
    if ((await rows(table)) >= CAPS[table]) return true;
  }
  return false;
}

export function clearCapacityCache() {
  for (const k of Object.keys(fullUntil) as CappedTable[]) delete fullUntil[k];
}

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_WEIGHTS, type WheelGiftType } from "./gifts";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, key) });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown) {
  const json = JSON.stringify(value);
  await db
    .insert(schema.settings)
    .values({ key, value: json })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: json } });
}

export const getWheelWeights = () =>
  getSetting<Record<WheelGiftType, number>>("wheelWeights", DEFAULT_WEIGHTS);

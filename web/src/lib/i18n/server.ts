import "server-only";
import { cookies } from "next/headers";
import { dicts } from "./dict";
import type { Locale } from "../gifts";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "es";
}

export async function getT() {
  const locale = await getLocale();
  return { t: dicts[locale], locale };
}

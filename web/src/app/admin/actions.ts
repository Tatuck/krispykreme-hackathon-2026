"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { canWipeData, isStaff } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { getClockOffsetDays, setClockOffsetDays } from "@/lib/clock";
import { WHEEL_GIFT_TYPES } from "@/lib/gifts";
import { getCustomer, runDailyJob, sendBirthday, sendWinback, type DailyResult } from "@/lib/loyalty";
import { sendCustomerEmail } from "@/lib/email/send";
import { resetAllData, seedDemoData } from "@/lib/seed";
import type { EmailKind } from "@/lib/email/templates";

async function guard() {
  if (!(await isStaff())) throw new Error("unauthorized");
}

export async function saveWeightsAction(form: FormData) {
  await guard();
  const weights = Object.fromEntries(
    WHEEL_GIFT_TYPES.map((t) => [t, Math.max(0, Math.min(1000, Number(form.get(t)) || 0))]),
  );
  await setSetting("wheelWeights", weights);
  revalidatePath("/admin/wheel");
}

export async function shiftClockAction(days: number) {
  await guard();
  await setClockOffsetDays(days === 0 ? 0 : (await getClockOffsetDays()) + days);
  revalidatePath("/", "layout");
}

export async function runDailyAction(): Promise<DailyResult> {
  await guard();
  const r = await runDailyJob();
  revalidatePath("/", "layout");
  return r;
}

export async function seedAction() {
  await guard();
  const n = await seedDemoData();
  revalidatePath("/", "layout");
  return n;
}

export async function resetAction() {
  if (!(await canWipeData())) throw new Error("unauthorized");
  await resetAllData();
  revalidatePath("/", "layout");
}

export async function customerCampaignAction(customerId: number, kind: "birthday" | "winback" | "resend") {
  await guard();
  const c = await getCustomer(customerId);
  if (!c) return { status: "failed" as const };
  let res;
  if (kind === "birthday") res = await sendBirthday(c);
  else if (kind === "winback") res = await sendWinback(c);
  else {
    const last = await db.query.emails.findFirst({
      where: eq(schema.emails.customerId, c.id),
      orderBy: (e, { desc }) => [desc(e.id)],
    });
    res = await sendCustomerEmail(c, (last?.kind as EmailKind) ?? "magic_link");
  }
  revalidatePath(`/admin/customers/${customerId}`);
  return { status: res.status, error: res.error };
}

"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { clearCustomerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function setLocaleAction(locale: "es" | "en") {
  (await cookies()).set("lang", locale === "en" ? "en" : "es", { path: "/", maxAge: 365 * 24 * 60 * 60 });
  revalidatePath("/", "layout");
}

export async function logoutAction() {
  await clearCustomerSession();
  redirect("/");
}

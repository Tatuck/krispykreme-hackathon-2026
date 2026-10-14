"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkStaffPin, clearStaffSession, isStaff, setStaffSession } from "@/lib/auth";
import {
  activeGifts,
  applyPurchase,
  createTicket,
  lookupCode,
  redeemGift,
  type PurchaseSummary,
} from "@/lib/loyalty";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { normalizeCode } from "@/lib/codes";
import { now } from "@/lib/clock";
import { hasRoom } from "@/lib/limits";
import { madridMonthDay } from "@/lib/format";
import type { GiftType } from "@/lib/gifts";
import { cartTotals, quoteSale, stampCardForCart, type CartLine, type DiscountLine, type GiftRuleError } from "@/lib/pricing";

export async function staffLoginAction(_prev: { error: boolean }, form: FormData) {
  const role = checkStaffPin(String(form.get("pin") ?? ""));
  if (!role) return { error: true };
  await setStaffSession(role);
  // Same-site paths only (no open redirect through the login form).
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/staff");
}

export async function staffLogoutAction() {
  await clearStaffSession();
  redirect("/staff/login");
}

async function guard() {
  if (!(await isStaff())) throw new Error("unauthorized");
}

const cartSchema = z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(50) })).max(30);

const saleSchema = z.object({
  items: z.string().transform((v, ctx) => {
    try {
      return cartSchema.parse(JSON.parse(v));
    } catch {
      ctx.addIssue({ code: "custom", message: "items" });
      return z.NEVER;
    }
  }),
  memberCode: z.string().optional(),
  giftCode: z.string().optional(),
});

export type SalePreview = {
  items: CartLine[];
  boxes: number;
  units: number;
  boxStamps: number[];
  member: { name: string; refCode: string } | null;
  giftCode: string | null;
  giftType: string | null;
  subtotalCents: number;
  discounts: DiscountLine[];
  totalCents: number;
};

type SaleError = "invalid" | "demoFull" | "notFound" | "giftUsed" | "giftExpired" | "giftOtherMember" | GiftRuleError;

/**
 * Validates the kiosk cart and prices it from the catalog, without side effects. A gift handed over
 * without a member code links the sale to the gift's owner, so their first box (referral) still counts.
 */
async function quoteFromForm(
  form: FormData,
): Promise<{ error: SaleError } | { preview: SalePreview; memberId: number | null }> {
  const parsed = saleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const cart = cartTotals(parsed.data.items);
  if (!cart || cart.lines.length === 0) return { error: "invalid" };
  const memberCode = parsed.data.memberCode ? normalizeCode(parsed.data.memberCode) : "";
  const giftCode = parsed.data.giftCode ? normalizeCode(parsed.data.giftCode) : "";
  const at = await now();

  let member = memberCode
    ? await db.query.customers.findFirst({ where: eq(schema.customers.refCode, memberCode) })
    : null;
  if (memberCode && !member) return { error: "notFound" };

  const gift = giftCode ? await db.query.gifts.findFirst({ where: eq(schema.gifts.code, giftCode) }) : null;
  if (giftCode && !gift) return { error: "notFound" };
  if (gift) {
    if (gift.status === "used") return { error: "giftUsed" };
    if (gift.status === "expired" || gift.expiresAt < at) return { error: "giftExpired" };
    if (member && gift.customerId !== member.id) return { error: "giftOtherMember" };
    member ??= await db.query.customers.findFirst({ where: eq(schema.customers.id, gift.customerId) });
  }

  const card = member ? stampCardForCart(member.stamps, cart) : null;
  const q = quoteSale(cart, {
    giftType: (gift?.type as GiftType) ?? null,
    freeBoxCents: card?.freeCents,
    birthday: !!member && member.dob.slice(5) === madridMonthDay(at),
  });
  if ("error" in q) return { error: q.error };
  return {
    memberId: member?.id ?? null,
    preview: {
      items: cart.lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      boxes: cart.boxes,
      units: cart.units,
      boxStamps: cart.boxList.map((b) => b.stamp),
      member: member ? { name: member.name ?? member.email, refCode: member.refCode } : null,
      giftCode: gift?.code ?? null,
      giftType: gift?.type ?? null,
      ...q,
    },
  };
}

export type SaleState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "done"; ticketCode: string; preview: SalePreview; summary: PurchaseSummary | null };

/** Registers the sale. A 0 € ticket is still a sale: that's how free-doughnut gifts are redeemed. */
export async function createSaleAction(_prev: SaleState, form: FormData): Promise<SaleState> {
  await guard();
  const r = await quoteFromForm(form);
  if ("error" in r) return { status: "error", error: r.error };
  const { preview, memberId } = r;
  if (!(await hasRoom("tickets"))) return { status: "error", error: "demoFull" };

  if (preview.giftCode) {
    const g = await redeemGift(preview.giftCode);
    if (!g.ok) return { status: "error", error: g.error };
  }

  const ticket = await createTicket({
    boxes: preview.boxes,
    units: preview.units,
    amountCents: preview.totalCents,
    discounts: preview.discounts,
    items: preview.items,
    customerId: memberId,
    appliedGiftCode: preview.giftCode,
  });
  const summary = memberId
    ? await applyPurchase(memberId, {
        boxes: preview.boxes,
        units: preview.units,
        amountCents: preview.totalCents,
        boxStamps: preview.boxStamps,
        autoFree: true,
      })
    : null;
  revalidatePath("/staff");
  return { status: "done", ticketCode: ticket.code, preview, summary };
}

export type CustomerAtCounter = {
  name: string;
  refCode: string;
  tier: string;
  stamps: number;
  birthdayToday: boolean;
  gifts: { code: string; type: string; expiresAt: number }[];
};

export type CustomerLookup =
  | { ok: true; customer: CustomerAtCounter; scannedGift: string | null }
  | { ok: false; error: "notFound" | "giftUsed" | "giftExpired" };

/**
 * Whatever QR the customer shows (member card, a gift, a referral link) identifies them at the
 * counter: returns who they are and every gift they can use. A scanned gift comes preselected.
 */
export async function customerLookupAction(code: string): Promise<CustomerLookup> {
  await guard();
  const r = await lookupCode(code);
  if (r.kind === "none") return { ok: false, error: "notFound" };
  if (r.kind === "gift" && r.state !== "active") return { ok: false, error: r.state === "used" ? "giftUsed" : "giftExpired" };
  const customer = r.customer;
  if (!customer) return { ok: false, error: "notFound" };
  const at = await now();
  const gifts = r.kind === "member" ? r.gifts : await activeGifts(customer.id, at);
  return {
    ok: true,
    scannedGift: r.kind === "gift" ? r.gift.code : null,
    customer: {
      name: customer.name ?? customer.email,
      refCode: customer.refCode,
      tier: customer.tier,
      stamps: customer.stamps,
      birthdayToday: customer.dob.slice(5) === madridMonthDay(at),
      gifts: gifts.map((g) => ({ code: g.code, type: g.type, expiresAt: g.expiresAt })),
    },
  };
}

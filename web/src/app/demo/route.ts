import { NextResponse } from "next/server";
import { createTicket } from "@/lib/loyalty";
import { cartTotals, type CartLine } from "@/lib/pricing";
import { publicDemo } from "@/lib/demo";
import { getBaseUrl } from "@/lib/url";
import { hasRoom } from "@/lib/limits";

export const dynamic = "force-dynamic";

const DEMO_CART: CartLine[] = [{ id: "dozen-og", qty: 1 }];

// Permanent QR for the pitch (public demo only): every scan rings up a fresh one-dozen ticket and
// opens its claim page, so the wheel always spins and the printed code never "expires".
export async function GET() {
  if (!publicDemo) return new NextResponse(null, { status: 404 });
  if (!(await hasRoom("tickets"))) return NextResponse.redirect(`${await getBaseUrl()}/?full=1`, 303);
  const totals = cartTotals(DEMO_CART)!;
  const ticket = await createTicket({
    boxes: totals.boxes,
    units: totals.units,
    amountCents: totals.subtotalCents,
    items: DEMO_CART,
  });
  const res = NextResponse.redirect(`${await getBaseUrl()}/t/${ticket.code}`, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

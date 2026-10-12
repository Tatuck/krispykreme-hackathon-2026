import { NextResponse, type NextRequest } from "next/server";
import { setCustomerSession, verifyMagicToken } from "@/lib/auth";
import { getCustomer } from "@/lib/loyalty";
import { getBaseUrl } from "@/lib/url";

export async function GET(_req: NextRequest, ctx: RouteContext<"/auth/[token]">) {
  const { token } = await ctx.params;
  const id = verifyMagicToken(token);
  const customer = id ? await getCustomer(id) : null;
  // Not req.url: behind `next start -H 0.0.0.0` it reports localhost, not the public host.
  const base = await getBaseUrl();
  if (!customer) return NextResponse.redirect(new URL("/login?e=1", base));
  await setCustomerSession(customer.id);
  return NextResponse.redirect(new URL("/me", base));
}

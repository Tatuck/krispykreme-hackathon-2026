import { NextResponse, type NextRequest } from "next/server";
import { trackEmail } from "@/lib/tracking";
import { getBaseUrl } from "@/lib/url";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/e/c/[id]">) {
  const { id } = await ctx.params;
  await trackEmail(Number(id), "click").catch(() => {});
  // Only redirect to our own origin (no open redirect). Not req.url: it can report localhost.
  const base = await getBaseUrl();
  const target = req.nextUrl.searchParams.get("u") ?? "/";
  try {
    const url = new URL(target, base);
    if (url.origin === new URL(base).origin) return NextResponse.redirect(url);
  } catch {}
  return NextResponse.redirect(new URL("/me", base));
}

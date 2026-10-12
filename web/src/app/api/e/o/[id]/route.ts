import { trackEmail } from "@/lib/tracking";

const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(_req: Request, ctx: RouteContext<"/api/e/o/[id]">) {
  const { id } = await ctx.params;
  await trackEmail(Number(id), "open").catch(() => {});
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" },
  });
}

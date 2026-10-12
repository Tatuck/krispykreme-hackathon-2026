import { NextResponse, type NextRequest } from "next/server";
import { runDailyJob } from "@/lib/loyalty";

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runDailyJob());
}

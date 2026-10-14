import { NextResponse, type NextRequest } from "next/server";
import { runDailyJob } from "@/lib/loyalty";
import { publicDemo } from "@/lib/demo";
import { isDbFull } from "@/lib/limits";
import { resetAllData, seedDemoData } from "@/lib/seed";

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Public demo: once visitors fill a capped table, start the next day from fresh sample data.
  const reset = publicDemo && (await isDbFull());
  if (reset) {
    await resetAllData();
    await seedDemoData();
  }
  return NextResponse.json({ reset, ...(await runDailyJob()) });
}

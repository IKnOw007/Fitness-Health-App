import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { clamp, currentProfileId, int } from "@/lib/api";
import { todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const profileId = await currentProfileId();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = clamp(int(body.amountMl, 250), -2000, 2000);
  const logDate = todayISO();

  const [row] = await db
    .insert(dailyLogs)
    .values({ profileId, logDate, waterMl: Math.max(0, amount) })
    .onConflictDoUpdate({
      target: [dailyLogs.profileId, dailyLogs.logDate],
      set: {
        waterMl: sql`greatest(0, least(10000, ${dailyLogs.waterMl} + ${amount}))`,
      },
    })
    .returning();

  return Response.json({ ok: true, waterMl: row.waterMl });
}

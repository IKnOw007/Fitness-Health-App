import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs } from "@/db/schema";
import { badRequest, clamp, currentProfileId, int, num, str } from "@/lib/api";
import { addDays, todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await currentProfileId();
  const since = addDays(todayISO(), -29);
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.profileId, profileId), gte(dailyLogs.logDate, since)))
    .orderBy(dailyLogs.logDate);
  return Response.json({ ok: true, logs: rows });
}

/** Upsert the daily log for a given date (defaults to today). */
export async function POST(request: Request) {
  const profileId = await currentProfileId();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid payload");

  const logDate = str(body.logDate, todayISO());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return badRequest("Invalid date");

  const patch: Partial<typeof dailyLogs.$inferInsert> = {};
  if (body.steps !== undefined && body.steps !== "") patch.steps = clamp(int(body.steps), 0, 100000);
  if (body.waterMl !== undefined && body.waterMl !== "")
    patch.waterMl = clamp(int(body.waterMl), 0, 10000);
  if (body.sleepHours !== undefined && body.sleepHours !== "")
    patch.sleepHours = clamp(num(body.sleepHours), 0, 24);
  if (body.restingHr !== undefined && body.restingHr !== "")
    patch.restingHr = clamp(int(body.restingHr), 30, 200);
  if (body.weightKg !== undefined && body.weightKg !== "")
    patch.weightKg = clamp(num(body.weightKg), 20, 400);
  if (body.mood !== undefined && body.mood !== "") patch.mood = str(body.mood, "good");

  if (Object.keys(patch).length === 0) return badRequest("Nothing to update");

  const [row] = await db
    .insert(dailyLogs)
    .values({ profileId, logDate, ...patch })
    .onConflictDoUpdate({
      target: [dailyLogs.profileId, dailyLogs.logDate],
      set: patch,
    })
    .returning();

  return Response.json({ ok: true, log: row });
}

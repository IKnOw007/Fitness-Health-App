import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { badRequest, clamp, currentProfileId, int, num, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await currentProfileId();
  const rows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.profileId, profileId))
    .orderBy(desc(workouts.performedAt))
    .limit(100);
  return Response.json({ ok: true, workouts: rows });
}

export async function POST(request: Request) {
  const profileId = await currentProfileId();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid payload");

  const title = str(body.title);
  if (!title) return badRequest("Workout name is required");

  const rawDate = str(body.performedAt);
  const performedAt = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(performedAt.getTime())) return badRequest("Invalid date");

  const distance = num(body.distanceKm, 0);

  const [created] = await db
    .insert(workouts)
    .values({
      profileId,
      title,
      category: str(body.category, "strength"),
      durationMin: clamp(int(body.durationMin, 30), 1, 600),
      calories: clamp(int(body.calories, 200), 0, 5000),
      intensity: str(body.intensity, "medium"),
      distanceKm: distance > 0 ? distance : null,
      notes: str(body.notes) || null,
      performedAt,
    })
    .returning();

  return Response.json({ ok: true, workout: created }, { status: 201 });
}

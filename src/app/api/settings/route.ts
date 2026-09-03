import { eq } from "drizzle-orm";
import { db } from "@/db";
import { goals, profiles } from "@/db/schema";
import { badRequest, clamp, currentProfileId, int, num, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await currentProfileId();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  const [goal] = await db.select().from(goals).where(eq(goals.profileId, profileId));
  return Response.json({ ok: true, profile, goal });
}

export async function PUT(request: Request) {
  const profileId = await currentProfileId();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid payload");

  await db
    .update(profiles)
    .set({
      name: str(body.name, "Athlete"),
      age: clamp(int(body.age, 30), 10, 100),
      heightCm: clamp(int(body.heightCm, 175), 100, 250),
      activityLevel: str(body.activityLevel, "moderate"),
    })
    .where(eq(profiles.id, profileId));

  await db
    .update(goals)
    .set({
      calorieTarget: clamp(int(body.calorieTarget, 2400), 800, 8000),
      burnTarget: clamp(int(body.burnTarget, 600), 100, 4000),
      proteinTarget: clamp(int(body.proteinTarget, 150), 20, 500),
      stepTarget: clamp(int(body.stepTarget, 10000), 1000, 50000),
      waterTargetMl: clamp(int(body.waterTargetMl, 2500), 500, 8000),
      sleepTargetHours: clamp(num(body.sleepTargetHours, 8), 4, 12),
      activeMinutesTarget: clamp(int(body.activeMinutesTarget, 45), 10, 300),
      workoutsPerWeek: clamp(int(body.workoutsPerWeek, 5), 1, 14),
      weightTargetKg: clamp(num(body.weightTargetKg, 75), 30, 300),
    })
    .where(eq(goals.profileId, profileId));

  return Response.json({ ok: true });
}

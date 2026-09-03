import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals } from "@/db/schema";
import { badRequest, clamp, currentProfileId, int, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const profileId = await currentProfileId();
  const rows = await db
    .select()
    .from(meals)
    .where(eq(meals.profileId, profileId))
    .orderBy(desc(meals.consumedAt))
    .limit(100);
  return Response.json({ ok: true, meals: rows });
}

export async function POST(request: Request) {
  const profileId = await currentProfileId();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return badRequest("Invalid payload");

  const name = str(body.name);
  if (!name) return badRequest("Meal name is required");

  const rawDate = str(body.consumedAt);
  const consumedAt = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(consumedAt.getTime())) return badRequest("Invalid date");

  const [created] = await db
    .insert(meals)
    .values({
      profileId,
      name,
      mealType: str(body.mealType, "lunch"),
      calories: clamp(int(body.calories, 0), 0, 6000),
      protein: clamp(int(body.protein, 0), 0, 500),
      carbs: clamp(int(body.carbs, 0), 0, 800),
      fat: clamp(int(body.fat, 0), 0, 400),
      consumedAt,
    })
    .returning();

  return Response.json({ ok: true, meal: created }, { status: 201 });
}

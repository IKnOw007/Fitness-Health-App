import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meals } from "@/db/schema";
import { badRequest, currentProfileId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const mealId = Number.parseInt(id, 10);
  if (!Number.isFinite(mealId)) return badRequest("Invalid id");

  const profileId = await currentProfileId();
  await db.delete(meals).where(and(eq(meals.id, mealId), eq(meals.profileId, profileId)));
  return Response.json({ ok: true });
}

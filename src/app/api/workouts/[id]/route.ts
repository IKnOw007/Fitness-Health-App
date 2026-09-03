import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { badRequest, currentProfileId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const workoutId = Number.parseInt(id, 10);
  if (!Number.isFinite(workoutId)) return badRequest("Invalid id");

  const profileId = await currentProfileId();
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.profileId, profileId)));
  return Response.json({ ok: true });
}

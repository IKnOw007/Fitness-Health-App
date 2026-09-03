import type { workouts } from "@/db/schema";
import { ApiError } from "@/server/errors";
import { preflight, route } from "@/server/handler";
import { noContent, ok, parseBody } from "@/server/http";
import { deleteWorkout, getWorkout, updateWorkout } from "@/server/repo";
import { workoutUpdateBody } from "@/server/schemas";
import { serializeWorkout } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw ApiError.badRequest("Workout id must be numeric");
  return id;
}

export const GET = route<{ id: string }>(async ({ params, auth }) =>
  ok(serializeWorkout(await getWorkout(auth.profileId, parseId(params.id)))),
);

export const PATCH = route<{ id: string }>(async ({ request, params, auth }) => {
  const body = await parseBody(request, workoutUpdateBody);
  const patch: Partial<typeof workouts.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.category !== undefined) patch.category = body.category;
  if (body.durationMin !== undefined) patch.durationMin = body.durationMin;
  if (body.calories !== undefined) patch.calories = body.calories;
  if (body.intensity !== undefined) patch.intensity = body.intensity;
  if (body.distanceKm !== undefined) patch.distanceKm = body.distanceKm ?? null;
  if (body.notes !== undefined) patch.notes = body.notes ?? null;
  if (body.performedAt !== undefined) patch.performedAt = new Date(body.performedAt);

  const row = await updateWorkout(auth.profileId, parseId(params.id), patch);
  return ok(serializeWorkout(row));
});

export const DELETE = route<{ id: string }>(async ({ params, auth }) => {
  await deleteWorkout(auth.profileId, parseId(params.id));
  return noContent();
});

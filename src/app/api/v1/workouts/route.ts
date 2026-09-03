import { preflight, route } from "@/server/handler";
import { created, ok, paginationMeta, parseBody, parseQuery } from "@/server/http";
import { createWorkout, listWorkouts } from "@/server/repo";
import { workoutCreateBody, workoutQuery } from "@/server/schemas";
import { serializeWorkout } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url, auth }) => {
  const query = parseQuery(url, workoutQuery);
  const result = await listWorkouts(auth.profileId, query);
  return ok(result.items.map(serializeWorkout), {
    ...paginationMeta(result.total, result.limit, result.offset),
    totals: { minutes: result.aggregate?.minutes ?? 0, calories: result.aggregate?.calories ?? 0 },
  });
});

export const POST = route(async ({ request, auth }) => {
  const body = await parseBody(request, workoutCreateBody);
  const row = await createWorkout(auth.profileId, {
    title: body.title,
    category: body.category,
    durationMin: body.durationMin,
    calories: body.calories,
    intensity: body.intensity,
    distanceKm: body.distanceKm ?? null,
    notes: body.notes ?? null,
    performedAt: body.performedAt ? new Date(body.performedAt) : new Date(),
  });
  return created(serializeWorkout(row));
});

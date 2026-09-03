import type { meals } from "@/db/schema";
import { ApiError } from "@/server/errors";
import { preflight, route } from "@/server/handler";
import { noContent, ok, parseBody } from "@/server/http";
import { deleteMeal, getMeal, updateMeal } from "@/server/repo";
import { mealUpdateBody } from "@/server/schemas";
import { serializeMeal } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

function parseId(raw: string): number {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id)) throw ApiError.badRequest("Meal id must be numeric");
  return id;
}

export const GET = route<{ id: string }>(async ({ params, auth }) =>
  ok(serializeMeal(await getMeal(auth.profileId, parseId(params.id)))),
);

export const PATCH = route<{ id: string }>(async ({ request, params, auth }) => {
  const body = await parseBody(request, mealUpdateBody);
  const patch: Partial<typeof meals.$inferInsert> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.mealType !== undefined) patch.mealType = body.mealType;
  if (body.calories !== undefined) patch.calories = body.calories;
  if (body.protein !== undefined) patch.protein = body.protein;
  if (body.carbs !== undefined) patch.carbs = body.carbs;
  if (body.fat !== undefined) patch.fat = body.fat;
  if (body.consumedAt !== undefined) patch.consumedAt = new Date(body.consumedAt);

  return ok(serializeMeal(await updateMeal(auth.profileId, parseId(params.id), patch)));
});

export const DELETE = route<{ id: string }>(async ({ params, auth }) => {
  await deleteMeal(auth.profileId, parseId(params.id));
  return noContent();
});

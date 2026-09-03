import { preflight, route } from "@/server/handler";
import { created, ok, paginationMeta, parseBody, parseQuery } from "@/server/http";
import { createMeal, listMeals } from "@/server/repo";
import { mealCreateBody, mealQuery } from "@/server/schemas";
import { serializeMeal } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url, auth }) => {
  const query = parseQuery(url, mealQuery);
  const result = await listMeals(auth.profileId, query);
  return ok(result.items.map(serializeMeal), {
    ...paginationMeta(result.total, result.limit, result.offset),
    totals: {
      calories: result.aggregate?.calories ?? 0,
      protein: result.aggregate?.protein ?? 0,
      carbs: result.aggregate?.carbs ?? 0,
      fat: result.aggregate?.fat ?? 0,
    },
  });
});

export const POST = route(async ({ request, auth }) => {
  const body = await parseBody(request, mealCreateBody);
  /** Derive calories from macros when the client omits them. */
  const calories = body.calories ?? Math.round(body.protein * 4 + body.carbs * 4 + body.fat * 9);
  const row = await createMeal(auth.profileId, {
    name: body.name,
    mealType: body.mealType,
    calories,
    protein: body.protein,
    carbs: body.carbs,
    fat: body.fat,
    consumedAt: body.consumedAt ? new Date(body.consumedAt) : new Date(),
  });
  return created(serializeMeal(row));
});

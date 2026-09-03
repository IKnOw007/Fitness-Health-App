import type { dailyLogs } from "@/db/schema";
import { ApiError } from "@/server/errors";
import { preflight, route } from "@/server/handler";
import { ok, parseBody } from "@/server/http";
import { getLog, upsertLog } from "@/server/repo";
import { logUpsertBody } from "@/server/schemas";
import { serializeLog } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

function assertDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw ApiError.badRequest("Date must be YYYY-MM-DD");
  return value;
}

export const GET = route<{ date: string }>(async ({ params, auth }) => {
  const date = assertDate(params.date);
  const row = await getLog(auth.profileId, date);
  if (!row) {
    return ok({
      date,
      steps: 0,
      waterMl: 0,
      sleepHours: 0,
      restingHr: 0,
      weightKg: null,
      mood: "good",
      logged: false,
    });
  }
  return ok({ ...serializeLog(row), logged: true });
});

export const PATCH = route<{ date: string }>(async ({ request, params, auth }) => {
  const date = assertDate(params.date);
  const body = await parseBody(request, logUpsertBody);
  const patch: Partial<typeof dailyLogs.$inferInsert> = {};
  if (body.steps !== undefined) patch.steps = body.steps;
  if (body.waterMl !== undefined) patch.waterMl = body.waterMl;
  if (body.sleepHours !== undefined) patch.sleepHours = body.sleepHours;
  if (body.restingHr !== undefined) patch.restingHr = body.restingHr;
  if (body.weightKg !== undefined) patch.weightKg = body.weightKg;
  if (body.mood !== undefined) patch.mood = body.mood;

  return ok(serializeLog(await upsertLog(auth.profileId, date, patch)));
});

export const PUT = PATCH;

import type { dailyLogs } from "@/db/schema";
import { todayISO } from "@/lib/date";
import { preflight, route } from "@/server/handler";
import { ok, parseBody, parseQuery } from "@/server/http";
import { listLogs, upsertLog } from "@/server/repo";
import { logQuery, logUpsertBody } from "@/server/schemas";
import { serializeLog } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url, auth }) => {
  const query = parseQuery(url, logQuery);
  const result = await listLogs(auth.profileId, query.from, query.to, query.days);
  return ok(result.items.map(serializeLog), {
    from: result.from,
    to: result.to,
    count: result.items.length,
  });
});

/** Upsert a day of metrics. Only supplied fields are written. */
export const POST = route(async ({ request, auth }) => {
  const body = await parseBody(request, logUpsertBody);
  const { logDate, ...rest } = body;
  const patch: Partial<typeof dailyLogs.$inferInsert> = {};
  if (rest.steps !== undefined) patch.steps = rest.steps;
  if (rest.waterMl !== undefined) patch.waterMl = rest.waterMl;
  if (rest.sleepHours !== undefined) patch.sleepHours = rest.sleepHours;
  if (rest.restingHr !== undefined) patch.restingHr = rest.restingHr;
  if (rest.weightKg !== undefined) patch.weightKg = rest.weightKg;
  if (rest.mood !== undefined) patch.mood = rest.mood;

  const row = await upsertLog(auth.profileId, logDate ?? todayISO(), patch);
  return ok(serializeLog(row));
});

export const PUT = POST;

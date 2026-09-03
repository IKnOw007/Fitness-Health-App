import { todayISO } from "@/lib/date";
import { preflight, route } from "@/server/handler";
import { ok, parseBody } from "@/server/http";
import { adjustWater, ensureGoals } from "@/server/repo";
import { waterBody } from "@/server/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

/** Atomically increments (or decrements) hydration for a day. */
export const POST = route(async ({ request, auth }) => {
  const body = await parseBody(request, waterBody);
  const [row, goals] = await Promise.all([
    adjustWater(auth.profileId, body.logDate ?? todayISO(), body.amountMl),
    ensureGoals(auth.profileId),
  ]);
  return ok({
    date: row.logDate,
    waterMl: row.waterMl,
    target: goals.waterTargetMl,
    percent: Math.round((row.waterMl / Math.max(1, goals.waterTargetMl)) * 100),
  });
});

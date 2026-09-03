import { preflight, route } from "@/server/handler";
import { ok, parseQuery } from "@/server/http";
import { summaryQuery } from "@/server/schemas";
import { dailySummary } from "@/server/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url, auth }) => {
  const { date } = parseQuery(url, summaryQuery);
  return ok(await dailySummary(auth.profileId, date));
});

import { preflight, route } from "@/server/handler";
import { ok, parseQuery } from "@/server/http";
import { trendsQuery } from "@/server/schemas";
import { trends } from "@/server/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ url, auth }) => {
  const { days } = parseQuery(url, trendsQuery);
  return ok(await trends(auth.profileId, days ?? 30));
});

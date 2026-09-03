import { preflight, route } from "@/server/handler";
import { ok } from "@/server/http";
import { insightsFor } from "@/server/stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ auth }) => ok(await insightsFor(auth.profileId)));

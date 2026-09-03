import { preflight, route } from "@/server/handler";
import { ok, parseBody } from "@/server/http";
import { ensureGoals, updateGoals } from "@/server/repo";
import { goalsBody } from "@/server/schemas";
import { serializeGoals } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ auth }) => ok(serializeGoals(await ensureGoals(auth.profileId))));

export const PATCH = route(async ({ request, auth }) => {
  const patch = await parseBody(request, goalsBody);
  return ok(serializeGoals(await updateGoals(auth.profileId, patch)));
});

export const PUT = PATCH;

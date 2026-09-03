import { preflight, route } from "@/server/handler";
import { ok, parseBody } from "@/server/http";
import { getProfile, updateProfile } from "@/server/repo";
import { profileBody } from "@/server/schemas";
import { serializeProfile } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ auth }) => ok(serializeProfile(await getProfile(auth.profileId))));

export const PATCH = route(async ({ request, auth }) => {
  const patch = await parseBody(request, profileBody);
  const row = await updateProfile(auth.profileId, patch);
  return ok(serializeProfile(row));
});

export const PUT = PATCH;

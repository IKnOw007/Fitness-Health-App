import { preflight, route } from "@/server/handler";
import { noContent, ok } from "@/server/http";
import { revokeToken } from "@/server/auth";
import { ensureGoals, getProfile } from "@/server/repo";
import { serializeGoals, serializeProfile } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ auth }) => {
  const [profile, goals] = await Promise.all([getProfile(auth.profileId), ensureGoals(auth.profileId)]);
  return ok({
    user: {
      id: auth.userId,
      email: auth.email,
      name: auth.name,
      role: auth.role,
    },
    profile: serializeProfile(profile),
    goals: serializeGoals(goals),
    session: { scopes: auth.scopes, tokenId: auth.tokenId, demo: auth.demo },
  });
});

/** Logout: revokes the token used for this request. */
export const DELETE = route(async ({ auth }) => {
  if (auth.tokenId) await revokeToken(auth.userId, auth.tokenId);
  return noContent();
});

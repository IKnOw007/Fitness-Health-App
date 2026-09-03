import { revokeToken } from "@/server/auth";
import { ApiError } from "@/server/errors";
import { preflight, route } from "@/server/handler";
import { noContent } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const DELETE = route<{ id: string }>(async ({ params, auth }) => {
  const tokenId = Number.parseInt(params.id, 10);
  if (!Number.isFinite(tokenId)) throw ApiError.badRequest("Token id must be numeric");
  const revoked = await revokeToken(auth.userId, tokenId);
  if (!revoked) throw ApiError.notFound("Token");
  return noContent();
});

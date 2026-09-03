import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureProfileForUser, issueToken, verifyPassword } from "@/server/auth";
import { config } from "@/server/config";
import { ApiError } from "@/server/errors";
import { preflight, publicRoute } from "@/server/handler";
import { ok, parseBody } from "@/server/http";
import { ensureGoals } from "@/server/repo";
import { loginBody } from "@/server/schemas";
import { serializeUser } from "@/server/serialize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const POST = publicRoute(async ({ request }) => {
  const body = await parseBody(request, loginBody);
  const email = body.email.toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const profileId = await ensureProfileForUser(user.id, user.name);
  await ensureGoals(profileId);
  const token = await issueToken(user.id, body.deviceName ?? "app");

  return ok({
    user: serializeUser(user),
    profileId,
    token: {
      accessToken: token.token,
      tokenType: "Bearer",
      expiresIn: config.tokenTtlDays * 86400,
      expiresAt: token.expiresAt.toISOString(),
    },
  });
}, { rateLimitMax: config.rateLimit.authMax });

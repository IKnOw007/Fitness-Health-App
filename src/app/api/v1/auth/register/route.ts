import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureProfileForUser, hashPassword, issueToken } from "@/server/auth";
import { config } from "@/server/config";
import { ApiError } from "@/server/errors";
import { publicRoute, preflight } from "@/server/handler";
import { created, parseBody } from "@/server/http";
import { ensureGoals } from "@/server/repo";
import { registerBody } from "@/server/schemas";
import { serializeGoals, serializeProfile, serializeUser } from "@/server/serialize";
import { getProfile } from "@/server/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const POST = publicRoute(async ({ request }) => {
  const body = await parseBody(request, registerBody);
  const email = body.email.toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw ApiError.conflict("An account with that email already exists");

  const [user] = await db
    .insert(users)
    .values({ email, name: body.name, passwordHash: hashPassword(body.password) })
    .returning();

  const profileId = await ensureProfileForUser(user.id, user.name);
  const goals = await ensureGoals(profileId);
  const token = await issueToken(user.id, "signup");

  return created({
    user: serializeUser(user),
    profile: serializeProfile(await getProfile(profileId)),
    goals: serializeGoals(goals),
    token: {
      accessToken: token.token,
      tokenType: "Bearer",
      expiresAt: token.expiresAt.toISOString(),
    },
  });
}, { rateLimitMax: config.rateLimit.authMax });

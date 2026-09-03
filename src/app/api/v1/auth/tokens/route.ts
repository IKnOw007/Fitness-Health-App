import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { issueToken } from "@/server/auth";
import { preflight, route } from "@/server/handler";
import { created, ok, parseBody } from "@/server/http";
import { tokenBody } from "@/server/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const OPTIONS = preflight;

export const GET = route(async ({ auth }) => {
  const rows = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, auth.userId))
    .orderBy(desc(apiTokens.createdAt))
    .limit(50);

  return ok(
    rows.map((t) => ({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      scopes: t.scopes.split(","),
      current: t.id === auth.tokenId,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      revokedAt: t.revokedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  );
});

export const POST = route(async ({ request, auth }) => {
  const body = await parseBody(request, tokenBody);
  const issued = await issueToken(auth.userId, body.name, body.scopes ?? ["read", "write"]);
  return created({
    id: issued.id,
    name: body.name,
    prefix: issued.prefix,
    /** Shown once — store it securely in your client. */
    accessToken: issued.token,
    tokenType: "Bearer",
    expiresAt: issued.expiresAt.toISOString(),
  });
});

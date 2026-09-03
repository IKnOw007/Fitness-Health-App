import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/db";
import { apiTokens, profiles, users } from "@/db/schema";
import { config } from "@/server/config";
import { ApiError } from "@/server/errors";

const SCRYPT_KEYLEN = 64;
export const TOKEN_PREFIX = "pf_";

export type Scope = "read" | "write" | "admin";

export type AuthContext = {
  userId: number;
  profileId: number;
  email: string;
  name: string;
  role: string;
  scopes: Scope[];
  tokenId: number | null;
  demo: boolean;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, digest] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(digest, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function generateToken(): { token: string; tokenHash: string; prefix: string } {
  const secret = randomBytes(32).toString("base64url");
  const token = `${TOKEN_PREFIX}${secret}`;
  return { token, tokenHash: sha256(token), prefix: token.slice(0, 10) };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newRequestId(): string {
  return randomUUID();
}

function parseScopes(raw: string): Scope[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Scope => s === "read" || s === "write" || s === "admin");
}

export function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return apiKey.trim();
  return null;
}

/** Ensures a user always has exactly one profile row and returns its id. */
export async function ensureProfileForUser(userId: number, name: string): Promise<number> {
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing) return existing.id;
  const [createdProfile] = await db
    .insert(profiles)
    .values({ userId, name, startWeightKg: 80 })
    .returning();
  return createdProfile.id;
}

export async function issueToken(
  userId: number,
  name = "app",
  scopes: Scope[] = ["read", "write"],
): Promise<{ token: string; prefix: string; expiresAt: Date; id: number }> {
  const { token, tokenHash, prefix } = generateToken();
  const expiresAt = new Date(Date.now() + config.tokenTtlDays * 86_400_000);
  const [row] = await db
    .insert(apiTokens)
    .values({ userId, name, tokenHash, prefix, scopes: scopes.join(","), expiresAt })
    .returning();
  return { token, prefix, expiresAt, id: row.id };
}

export async function revokeToken(userId: number, tokenId: number): Promise<boolean> {
  const result = await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
    .returning();
  return result.length > 0;
}

async function demoContext(): Promise<AuthContext> {
  const { ensureSeeded } = await import("@/db/seed");
  await ensureSeeded();
  const [user] = await db.select().from(users).orderBy(users.id).limit(1);
  if (!user) throw ApiError.unauthorized("No demo account available");
  const profileId = await ensureProfileForUser(user.id, user.name);
  return {
    userId: user.id,
    profileId,
    email: user.email,
    name: user.name,
    role: user.role,
    scopes: ["read", "write"],
    tokenId: null,
    demo: true,
  };
}

/**
 * Resolves the caller. A valid bearer token always wins; when no token is supplied
 * and DEMO_MODE is on, requests fall back to the seeded demo account so the API is
 * explorable straight after deploy.
 */
export async function authenticate(request: Request): Promise<AuthContext> {
  const presented = extractBearer(request);
  if (!presented) {
    if (config.demoMode) return demoContext();
    throw ApiError.unauthorized("Provide a bearer token via the Authorization header");
  }

  const now = new Date();
  const [row] = await db
    .select({ token: apiTokens, user: users })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(
      and(
        eq(apiTokens.tokenHash, sha256(presented)),
        isNull(apiTokens.revokedAt),
        or(isNull(apiTokens.expiresAt), gt(apiTokens.expiresAt, now)),
      ),
    )
    .limit(1);

  if (!row) throw ApiError.unauthorized("Token is invalid, expired or revoked");

  void db
    .update(apiTokens)
    .set({ lastUsedAt: now })
    .where(eq(apiTokens.id, row.token.id))
    .catch(() => undefined);

  const profileId = await ensureProfileForUser(row.user.id, row.user.name);
  return {
    userId: row.user.id,
    profileId,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role,
    scopes: parseScopes(row.token.scopes),
    tokenId: row.token.id,
    demo: false,
  };
}

export function requireScope(auth: AuthContext, scope: Scope) {
  if (auth.scopes.includes("admin") || auth.scopes.includes(scope)) return;
  throw ApiError.forbidden(`This endpoint requires the "${scope}" scope`);
}

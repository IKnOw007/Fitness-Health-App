/** Runtime configuration for the PulseFit API. All values come from env with safe defaults. */

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function listEnv(key: string): string[] {
  return (process.env[key] ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const config = {
  apiVersion: "v1",
  appVersion: process.env.APP_VERSION ?? "1.0.0",
  gitSha: process.env.GIT_SHA ?? "local",
  environment: process.env.NODE_ENV ?? "development",
  /** Empty list means "reflect any origin" — tighten this in production via CORS_ALLOWED_ORIGINS. */
  corsAllowedOrigins: listEnv("CORS_ALLOWED_ORIGINS"),
  tokenTtlDays: intEnv("AUTH_TOKEN_TTL_DAYS", 30),
  rateLimit: {
    windowMs: intEnv("RATE_LIMIT_WINDOW_MS", 60_000),
    max: intEnv("RATE_LIMIT_MAX", 240),
    authMax: intEnv("RATE_LIMIT_AUTH_MAX", 12),
  },
  /** Allows unauthenticated requests to fall back to the seeded demo account. */
  demoMode: (process.env.DEMO_MODE ?? "true") !== "false",
  maxPageSize: intEnv("API_MAX_PAGE_SIZE", 100),
  defaultPageSize: intEnv("API_DEFAULT_PAGE_SIZE", 25),
} as const;

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (config.corsAllowedOrigins.length === 0) return true;
  return config.corsAllowedOrigins.includes(origin);
}

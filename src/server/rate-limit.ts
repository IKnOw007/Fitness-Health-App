/**
 * In-memory sliding-window rate limiter.
 * Good enough for a single container; swap the store for Redis when scaling horizontally.
 */
type Bucket = { hits: number[]; };

const globalForLimiter = globalThis as typeof globalThis & {
  __pulsefitRateLimiter?: Map<string, Bucket>;
};

const buckets = globalForLimiter.__pulsefitRateLimiter ?? new Map<string, Bucket>();
globalForLimiter.__pulsefitRateLimiter = buckets;

let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  const oldest = bucket.hits[0] ?? now;
  const resetSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, resetSeconds };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: Math.max(0, limit - bucket.hits.length), resetSeconds };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "anonymous";
}

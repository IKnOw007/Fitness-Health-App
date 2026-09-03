import { sql } from "drizzle-orm";
import { db } from "@/db";
import { config } from "@/server/config";
import { jsonResponse } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_TABLES = [
  "users",
  "api_tokens",
  "profiles",
  "goals",
  "workouts",
  "meals",
  "daily_logs",
  "exercises",
];

/** Readiness probe: verifies DB connectivity AND that migrations have been applied. */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    await db.execute(sql`select 1`);
    checks.database = { ok: true };
  } catch (error) {
    checks.database = { ok: false, detail: error instanceof Error ? error.message : "unreachable" };
  }

  if (checks.database.ok) {
    try {
      const result = await db.execute<{ table_name: string }>(
        sql`select table_name from information_schema.tables where table_schema = 'public'`,
      );
      const present = new Set(result.rows.map((r) => r.table_name));
      const missing = REQUIRED_TABLES.filter((t) => !present.has(t));
      checks.migrations = missing.length
        ? { ok: false, detail: `missing tables: ${missing.join(", ")}` }
        : { ok: true };
    } catch (error) {
      checks.migrations = { ok: false, detail: error instanceof Error ? error.message : "unknown" };
    }
  } else {
    checks.migrations = { ok: false, detail: "skipped, database unreachable" };
  }

  const ready = Object.values(checks).every((c) => c.ok);
  return jsonResponse(
    {
      ok: ready,
      status: ready ? "ready" : "degraded",
      version: config.appVersion,
      checks,
      latencyMs: Date.now() - started,
    },
    { status: ready ? 200 : 503 },
  );
}

#!/usr/bin/env node
/**
 * Idempotent schema migration for the PulseFit backend.
 *
 * Runs plain SQL DDL so production containers do not need drizzle-kit (a dev
 * dependency) in the runtime image. Safe to run on every boot.
 *
 *   node scripts/migrate.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

/** Minimal .env loader so the script runs locally without extra dependencies. */
function loadDotEnv(file = ".env") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     id serial PRIMARY KEY,
     email text NOT NULL,
     name text NOT NULL,
     password_hash text NOT NULL,
     role text NOT NULL DEFAULT 'user',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)`,

  `CREATE TABLE IF NOT EXISTS api_tokens (
     id serial PRIMARY KEY,
     user_id integer NOT NULL,
     name text NOT NULL DEFAULT 'app',
     token_hash text NOT NULL,
     prefix text NOT NULL,
     scopes text NOT NULL DEFAULT 'read,write',
     last_used_at timestamptz,
     expires_at timestamptz,
     revoked_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS api_tokens_hash_idx ON api_tokens (token_hash)`,
  `CREATE INDEX IF NOT EXISTS api_tokens_user_idx ON api_tokens (user_id)`,

  `CREATE TABLE IF NOT EXISTS profiles (
     id serial PRIMARY KEY,
     user_id integer,
     name text NOT NULL,
     age integer NOT NULL DEFAULT 30,
     height_cm integer NOT NULL DEFAULT 175,
     start_weight_kg double precision NOT NULL DEFAULT 80,
     activity_level text NOT NULL DEFAULT 'moderate',
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id integer`,
  `CREATE INDEX IF NOT EXISTS profiles_user_idx ON profiles (user_id)`,

  `CREATE TABLE IF NOT EXISTS goals (
     id serial PRIMARY KEY,
     profile_id integer NOT NULL,
     calorie_target integer NOT NULL DEFAULT 2400,
     burn_target integer NOT NULL DEFAULT 600,
     protein_target integer NOT NULL DEFAULT 150,
     step_target integer NOT NULL DEFAULT 10000,
     water_target_ml integer NOT NULL DEFAULT 2500,
     sleep_target_hours double precision NOT NULL DEFAULT 8,
     active_minutes_target integer NOT NULL DEFAULT 45,
     workouts_per_week integer NOT NULL DEFAULT 5,
     weight_target_kg double precision NOT NULL DEFAULT 74
   )`,
  `CREATE INDEX IF NOT EXISTS goals_profile_idx ON goals (profile_id)`,

  `CREATE TABLE IF NOT EXISTS workouts (
     id serial PRIMARY KEY,
     profile_id integer NOT NULL,
     title text NOT NULL,
     category text NOT NULL DEFAULT 'strength',
     duration_min integer NOT NULL DEFAULT 30,
     calories integer NOT NULL DEFAULT 200,
     intensity text NOT NULL DEFAULT 'medium',
     distance_km double precision,
     notes text,
     performed_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS workouts_profile_performed_idx ON workouts (profile_id, performed_at DESC)`,

  `CREATE TABLE IF NOT EXISTS meals (
     id serial PRIMARY KEY,
     profile_id integer NOT NULL,
     name text NOT NULL,
     meal_type text NOT NULL DEFAULT 'lunch',
     calories integer NOT NULL DEFAULT 0,
     protein integer NOT NULL DEFAULT 0,
     carbs integer NOT NULL DEFAULT 0,
     fat integer NOT NULL DEFAULT 0,
     consumed_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS meals_profile_consumed_idx ON meals (profile_id, consumed_at DESC)`,

  `CREATE TABLE IF NOT EXISTS daily_logs (
     id serial PRIMARY KEY,
     profile_id integer NOT NULL,
     log_date date NOT NULL,
     steps integer NOT NULL DEFAULT 0,
     water_ml integer NOT NULL DEFAULT 0,
     sleep_hours double precision NOT NULL DEFAULT 0,
     resting_hr integer NOT NULL DEFAULT 60,
     weight_kg double precision,
     mood text NOT NULL DEFAULT 'good'
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS daily_logs_profile_date_idx ON daily_logs (profile_id, log_date)`,

  `CREATE TABLE IF NOT EXISTS exercises (
     id serial PRIMARY KEY,
     name text NOT NULL,
     category text NOT NULL,
     muscle_group text NOT NULL,
     equipment text NOT NULL DEFAULT 'none',
     difficulty text NOT NULL DEFAULT 'beginner',
     met_value double precision NOT NULL DEFAULT 5,
     description text NOT NULL DEFAULT ''
   )`,
  `CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises (category)`,
];

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const attempts = Number.parseInt(process.env.MIGRATE_RETRIES ?? "10", 10);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await client.connect();
      break;
    } catch (error) {
      if (attempt === attempts) {
        console.error(`[migrate] could not connect after ${attempts} attempts:`, error.message);
        process.exit(1);
      }
      console.warn(`[migrate] database not ready (attempt ${attempt}/${attempts}), retrying in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  try {
    await client.query("BEGIN");
    for (const statement of STATEMENTS) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log(`[migrate] applied ${STATEMENTS.length} statements — schema is up to date`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[migrate] failed:", error.message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();

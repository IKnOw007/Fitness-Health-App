import {
  date,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("user"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull().default("app"),
    tokenHash: text("token_hash").notNull(),
    prefix: text("prefix").notNull(),
    scopes: text("scopes").notNull().default("read,write"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("api_tokens_hash_idx").on(table.tokenHash)],
);

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  age: integer("age").notNull().default(30),
  heightCm: integer("height_cm").notNull().default(175),
  startWeightKg: doublePrecision("start_weight_kg").notNull().default(80),
  activityLevel: text("activity_level").notNull().default("moderate"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  calorieTarget: integer("calorie_target").notNull().default(2400),
  burnTarget: integer("burn_target").notNull().default(600),
  proteinTarget: integer("protein_target").notNull().default(150),
  stepTarget: integer("step_target").notNull().default(10000),
  waterTargetMl: integer("water_target_ml").notNull().default(2500),
  sleepTargetHours: doublePrecision("sleep_target_hours").notNull().default(8),
  activeMinutesTarget: integer("active_minutes_target").notNull().default(45),
  workoutsPerWeek: integer("workouts_per_week").notNull().default(5),
  weightTargetKg: doublePrecision("weight_target_kg").notNull().default(74),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("strength"),
  durationMin: integer("duration_min").notNull().default(30),
  calories: integer("calories").notNull().default(200),
  intensity: text("intensity").notNull().default("medium"),
  distanceKm: doublePrecision("distance_km"),
  notes: text("notes"),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  name: text("name").notNull(),
  mealType: text("meal_type").notNull().default("lunch"),
  calories: integer("calories").notNull().default(0),
  protein: integer("protein").notNull().default(0),
  carbs: integer("carbs").notNull().default(0),
  fat: integer("fat").notNull().default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    logDate: date("log_date", { mode: "string" }).notNull(),
    steps: integer("steps").notNull().default(0),
    waterMl: integer("water_ml").notNull().default(0),
    sleepHours: doublePrecision("sleep_hours").notNull().default(0),
    restingHr: integer("resting_hr").notNull().default(60),
    weightKg: doublePrecision("weight_kg"),
    mood: text("mood").notNull().default("good"),
  },
  (table) => [uniqueIndex("daily_logs_profile_date_idx").on(table.profileId, table.logDate)],
);

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  equipment: text("equipment").notNull().default("none"),
  difficulty: text("difficulty").notNull().default("beginner"),
  metValue: doublePrecision("met_value").notNull().default(5),
  description: text("description").notNull().default(""),
});

export type User = typeof users.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type Meal = typeof meals.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;

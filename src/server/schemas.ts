import { z } from "zod";
import { config } from "@/server/config";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = z.string().regex(ISO_DATE, "Expected an ISO date (YYYY-MM-DD)");
export const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Expected an ISO date-time string");

export const WORKOUT_CATEGORIES = ["strength", "cardio", "hiit", "mobility", "core", "sport"] as const;
export const INTENSITIES = ["low", "medium", "high"] as const;
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const MOODS = ["great", "good", "tired", "sore"] as const;
export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "high", "athlete"] as const;

export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(config.maxPageSize).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const registerBody = z.object({
  email: z.string().regex(EMAIL, "Invalid email address").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().min(1).max(120),
});

export const loginBody = z.object({
  email: z.string().regex(EMAIL, "Invalid email address"),
  password: z.string().min(1),
  deviceName: z.string().max(120).optional(),
});

export const tokenBody = z.object({
  name: z.string().min(1).max(120).default("app"),
  scopes: z.array(z.enum(["read", "write", "admin"])).nonempty().optional(),
});

export const profileBody = z.object({
  name: z.string().min(1).max(120).optional(),
  age: z.coerce.number().int().min(10).max(100).optional(),
  heightCm: z.coerce.number().int().min(100).max(250).optional(),
  startWeightKg: z.coerce.number().min(20).max(400).optional(),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
});

export const goalsBody = z.object({
  calorieTarget: z.coerce.number().int().min(800).max(8000).optional(),
  burnTarget: z.coerce.number().int().min(100).max(4000).optional(),
  proteinTarget: z.coerce.number().int().min(20).max(500).optional(),
  stepTarget: z.coerce.number().int().min(1000).max(50000).optional(),
  waterTargetMl: z.coerce.number().int().min(500).max(8000).optional(),
  sleepTargetHours: z.coerce.number().min(4).max(12).optional(),
  activeMinutesTarget: z.coerce.number().int().min(10).max(300).optional(),
  workoutsPerWeek: z.coerce.number().int().min(1).max(14).optional(),
  weightTargetKg: z.coerce.number().min(30).max(300).optional(),
});

export const workoutCreateBody = z.object({
  title: z.string().min(1, "Workout title is required").max(160),
  category: z.enum(WORKOUT_CATEGORIES).default("strength"),
  durationMin: z.coerce.number().int().min(1).max(600),
  calories: z.coerce.number().int().min(0).max(5000).default(0),
  intensity: z.enum(INTENSITIES).default("medium"),
  distanceKm: z.coerce.number().min(0).max(500).nullish(),
  notes: z.string().max(500).nullish(),
  performedAt: isoDateTime.optional(),
});

/** Update bodies must NOT inherit create defaults, otherwise a partial PATCH would reset fields. */
export const workoutUpdateBody = z.object({
  title: z.string().min(1).max(160).optional(),
  category: z.enum(WORKOUT_CATEGORIES).optional(),
  durationMin: z.coerce.number().int().min(1).max(600).optional(),
  calories: z.coerce.number().int().min(0).max(5000).optional(),
  intensity: z.enum(INTENSITIES).optional(),
  distanceKm: z.coerce.number().min(0).max(500).nullish(),
  notes: z.string().max(500).nullish(),
  performedAt: isoDateTime.optional(),
});

export const workoutQuery = paginationQuery.extend({
  from: isoDate.optional(),
  to: isoDate.optional(),
  category: z.enum(WORKOUT_CATEGORIES).optional(),
  intensity: z.enum(INTENSITIES).optional(),
  q: z.string().max(120).optional(),
  sort: z.enum(["performedAt", "calories", "durationMin"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const mealCreateBody = z.object({
  name: z.string().min(1, "Meal name is required").max(160),
  mealType: z.enum(MEAL_TYPES).default("lunch"),
  calories: z.coerce.number().int().min(0).max(6000).optional(),
  protein: z.coerce.number().int().min(0).max(500).default(0),
  carbs: z.coerce.number().int().min(0).max(800).default(0),
  fat: z.coerce.number().int().min(0).max(400).default(0),
  consumedAt: isoDateTime.optional(),
});

export const mealUpdateBody = z.object({
  name: z.string().min(1).max(160).optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  calories: z.coerce.number().int().min(0).max(6000).optional(),
  protein: z.coerce.number().int().min(0).max(500).optional(),
  carbs: z.coerce.number().int().min(0).max(800).optional(),
  fat: z.coerce.number().int().min(0).max(400).optional(),
  consumedAt: isoDateTime.optional(),
});

export const mealQuery = paginationQuery.extend({
  from: isoDate.optional(),
  to: isoDate.optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  q: z.string().max(120).optional(),
});

export const logUpsertBody = z.object({
  logDate: isoDate.optional(),
  steps: z.coerce.number().int().min(0).max(100000).optional(),
  waterMl: z.coerce.number().int().min(0).max(10000).optional(),
  sleepHours: z.coerce.number().min(0).max(24).optional(),
  restingHr: z.coerce.number().int().min(30).max(200).optional(),
  weightKg: z.coerce.number().min(20).max(400).optional(),
  mood: z.enum(MOODS).optional(),
});

export const waterBody = z.object({
  amountMl: z.coerce.number().int().min(-2000).max(2000).default(250),
  logDate: isoDate.optional(),
});

export const logQuery = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const exerciseQuery = paginationQuery.extend({
  q: z.string().max(120).optional(),
  category: z.string().max(40).optional(),
  muscleGroup: z.string().max(40).optional(),
  equipment: z.string().max(40).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const summaryQuery = z.object({ date: isoDate.optional() });

export const trendsQuery = z.object({
  days: z.coerce.number().int().min(7).max(365).optional(),
});

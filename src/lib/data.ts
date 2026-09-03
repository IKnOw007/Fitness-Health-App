import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, exercises, goals, meals, profiles, workouts } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { addDays, lastNDates, toISODate, todayISO } from "@/lib/date";

export type WorkoutDTO = {
  id: number;
  title: string;
  category: string;
  durationMin: number;
  calories: number;
  intensity: string;
  distanceKm: number | null;
  notes: string | null;
  performedAt: string;
};

export type MealDTO = {
  id: number;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  consumedAt: string;
};

export type DailyLogDTO = {
  logDate: string;
  steps: number;
  waterMl: number;
  sleepHours: number;
  restingHr: number;
  weightKg: number | null;
  mood: string;
};

export type GoalDTO = {
  calorieTarget: number;
  burnTarget: number;
  proteinTarget: number;
  stepTarget: number;
  waterTargetMl: number;
  sleepTargetHours: number;
  activeMinutesTarget: number;
  workoutsPerWeek: number;
  weightTargetKg: number;
};

export type ProfileDTO = {
  id: number;
  name: string;
  age: number;
  heightCm: number;
  startWeightKg: number;
  activityLevel: string;
};

export type ExerciseDTO = {
  id: number;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  metValue: number;
  description: string;
};

const EMPTY_LOG = (logDate: string): DailyLogDTO => ({
  logDate,
  steps: 0,
  waterMl: 0,
  sleepHours: 0,
  restingHr: 0,
  weightKg: null,
  mood: "good",
});

function toWorkoutDTO(w: typeof workouts.$inferSelect): WorkoutDTO {
  return {
    id: w.id,
    title: w.title,
    category: w.category,
    durationMin: w.durationMin,
    calories: w.calories,
    intensity: w.intensity,
    distanceKm: w.distanceKm ?? null,
    notes: w.notes ?? null,
    performedAt: w.performedAt.toISOString(),
  };
}

function toMealDTO(m: typeof meals.$inferSelect): MealDTO {
  return {
    id: m.id,
    name: m.name,
    mealType: m.mealType,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    consumedAt: m.consumedAt.toISOString(),
  };
}

export async function getProfileContext(): Promise<{ profile: ProfileDTO; goal: GoalDTO }> {
  await ensureSeeded();
  const [profile] = await db.select().from(profiles).orderBy(profiles.id).limit(1);
  const [goal] = await db.select().from(goals).where(eq(goals.profileId, profile.id)).limit(1);
  return {
    profile: {
      id: profile.id,
      name: profile.name,
      age: profile.age,
      heightCm: profile.heightCm,
      startWeightKg: profile.startWeightKg,
      activityLevel: profile.activityLevel,
    },
    goal: {
      calorieTarget: goal.calorieTarget,
      burnTarget: goal.burnTarget,
      proteinTarget: goal.proteinTarget,
      stepTarget: goal.stepTarget,
      waterTargetMl: goal.waterTargetMl,
      sleepTargetHours: goal.sleepTargetHours,
      activeMinutesTarget: goal.activeMinutesTarget,
      workoutsPerWeek: goal.workoutsPerWeek,
      weightTargetKg: goal.weightTargetKg,
    },
  };
}

export async function getLogs(profileId: number, days: number): Promise<DailyLogDTO[]> {
  const since = addDays(todayISO(), -(days - 1));
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.profileId, profileId), gte(dailyLogs.logDate, since)))
    .orderBy(dailyLogs.logDate);
  const byDate = new Map(rows.map((r) => [r.logDate, r]));
  return lastNDates(days).map((iso) => {
    const row = byDate.get(iso);
    if (!row) return EMPTY_LOG(iso);
    return {
      logDate: row.logDate,
      steps: row.steps,
      waterMl: row.waterMl,
      sleepHours: row.sleepHours,
      restingHr: row.restingHr,
      weightKg: row.weightKg ?? null,
      mood: row.mood,
    };
  });
}

export async function getWorkoutsSince(profileId: number, days: number): Promise<WorkoutDTO[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.profileId, profileId), gte(workouts.performedAt, since)))
    .orderBy(desc(workouts.performedAt));
  return rows.map(toWorkoutDTO);
}

export async function getRecentWorkouts(profileId: number, limit: number): Promise<WorkoutDTO[]> {
  const rows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.profileId, profileId))
    .orderBy(desc(workouts.performedAt))
    .limit(limit);
  return rows.map(toWorkoutDTO);
}

export async function getMealsSince(profileId: number, days: number): Promise<MealDTO[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.profileId, profileId), gte(meals.consumedAt, since)))
    .orderBy(desc(meals.consumedAt));
  return rows.map(toMealDTO);
}

export async function getExercises(): Promise<ExerciseDTO[]> {
  const rows = await db.select().from(exercises).orderBy(exercises.category, exercises.name);
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    difficulty: e.difficulty,
    metValue: e.metValue,
    description: e.description,
  }));
}

export function macroTotals(list: MealDTO[]) {
  return list.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function groupByDay<T>(items: T[], getDate: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = toISODate(new Date(getDate(item)));
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/** Consecutive days (ending today or yesterday) with a workout logged. */
export function computeStreak(workoutList: WorkoutDTO[]): number {
  const days = new Set(workoutList.map((w) => toISODate(new Date(w.performedAt))));
  const today = todayISO();
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function getWorkoutStats(profileId: number) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      minutes: sql<number>`coalesce(sum(${workouts.durationMin}), 0)::int`,
      calories: sql<number>`coalesce(sum(${workouts.calories}), 0)::int`,
    })
    .from(workouts)
    .where(eq(workouts.profileId, profileId));
  return row ?? { total: 0, minutes: 0, calories: 0 };
}

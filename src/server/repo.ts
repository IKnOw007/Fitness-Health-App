import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, exercises, goals, meals, profiles, workouts } from "@/db/schema";
import { ApiError } from "@/server/errors";
import { config } from "@/server/config";
import { addDays, todayISO } from "@/lib/date";

export function startOfDay(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
export function endOfDay(iso: string): Date {
  return new Date(`${iso}T23:59:59.999Z`);
}

export function page(limit?: number, offset?: number) {
  return {
    limit: limit ?? config.defaultPageSize,
    offset: offset ?? 0,
  };
}

/* ------------------------------- profile ------------------------------- */

export async function getProfile(profileId: number) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!row) throw ApiError.notFound("Profile");
  return row;
}

export async function updateProfile(profileId: number, patch: Partial<typeof profiles.$inferInsert>) {
  if (Object.keys(patch).length === 0) return getProfile(profileId);
  const [row] = await db.update(profiles).set(patch).where(eq(profiles.id, profileId)).returning();
  if (!row) throw ApiError.notFound("Profile");
  return row;
}

/* -------------------------------- goals -------------------------------- */

export async function ensureGoals(profileId: number) {
  const [existing] = await db.select().from(goals).where(eq(goals.profileId, profileId)).limit(1);
  if (existing) return existing;
  const [row] = await db.insert(goals).values({ profileId }).returning();
  return row;
}

export async function updateGoals(profileId: number, patch: Partial<typeof goals.$inferInsert>) {
  await ensureGoals(profileId);
  if (Object.keys(patch).length === 0) return ensureGoals(profileId);
  const [row] = await db.update(goals).set(patch).where(eq(goals.profileId, profileId)).returning();
  return row;
}

/* ------------------------------- workouts ------------------------------- */

export type WorkoutFilters = {
  from?: string;
  to?: string;
  category?: string;
  intensity?: string;
  q?: string;
  sort?: "performedAt" | "calories" | "durationMin";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function listWorkouts(profileId: number, filters: WorkoutFilters) {
  const conditions: SQL[] = [eq(workouts.profileId, profileId)];
  if (filters.from) conditions.push(gte(workouts.performedAt, startOfDay(filters.from)));
  if (filters.to) conditions.push(lte(workouts.performedAt, endOfDay(filters.to)));
  if (filters.category) conditions.push(eq(workouts.category, filters.category));
  if (filters.intensity) conditions.push(eq(workouts.intensity, filters.intensity));
  if (filters.q) {
    const like = `%${filters.q}%`;
    const search = or(ilike(workouts.title, like), ilike(workouts.notes, like));
    if (search) conditions.push(search);
  }
  const where = and(...conditions);

  const sortColumn =
    filters.sort === "calories"
      ? workouts.calories
      : filters.sort === "durationMin"
        ? workouts.durationMin
        : workouts.performedAt;
  const direction = filters.order === "asc" ? asc : desc;
  const { limit, offset } = page(filters.limit, filters.offset);

  const [items, [totals]] = await Promise.all([
    db.select().from(workouts).where(where).orderBy(direction(sortColumn)).limit(limit).offset(offset),
    db
      .select({
        total: count(),
        minutes: sql<number>`coalesce(sum(${workouts.durationMin}), 0)::int`,
        calories: sql<number>`coalesce(sum(${workouts.calories}), 0)::int`,
      })
      .from(workouts)
      .where(where),
  ]);

  return { items, limit, offset, total: totals?.total ?? 0, aggregate: totals };
}

export async function getWorkout(profileId: number, id: number) {
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.profileId, profileId)))
    .limit(1);
  if (!row) throw ApiError.notFound("Workout");
  return row;
}

export async function createWorkout(profileId: number, values: Omit<typeof workouts.$inferInsert, "profileId">) {
  const [row] = await db.insert(workouts).values({ ...values, profileId }).returning();
  return row;
}

export async function updateWorkout(
  profileId: number,
  id: number,
  patch: Partial<typeof workouts.$inferInsert>,
) {
  await getWorkout(profileId, id);
  if (Object.keys(patch).length === 0) return getWorkout(profileId, id);
  const [row] = await db
    .update(workouts)
    .set(patch)
    .where(and(eq(workouts.id, id), eq(workouts.profileId, profileId)))
    .returning();
  return row;
}

export async function deleteWorkout(profileId: number, id: number) {
  const rows = await db
    .delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.profileId, profileId)))
    .returning({ id: workouts.id });
  if (rows.length === 0) throw ApiError.notFound("Workout");
}

/* --------------------------------- meals -------------------------------- */

export type MealFilters = {
  from?: string;
  to?: string;
  mealType?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listMeals(profileId: number, filters: MealFilters) {
  const conditions: SQL[] = [eq(meals.profileId, profileId)];
  if (filters.from) conditions.push(gte(meals.consumedAt, startOfDay(filters.from)));
  if (filters.to) conditions.push(lte(meals.consumedAt, endOfDay(filters.to)));
  if (filters.mealType) conditions.push(eq(meals.mealType, filters.mealType));
  if (filters.q) conditions.push(ilike(meals.name, `%${filters.q}%`));
  const where = and(...conditions);
  const { limit, offset } = page(filters.limit, filters.offset);

  const [items, [totals]] = await Promise.all([
    db.select().from(meals).where(where).orderBy(desc(meals.consumedAt)).limit(limit).offset(offset),
    db
      .select({
        total: count(),
        calories: sql<number>`coalesce(sum(${meals.calories}), 0)::int`,
        protein: sql<number>`coalesce(sum(${meals.protein}), 0)::int`,
        carbs: sql<number>`coalesce(sum(${meals.carbs}), 0)::int`,
        fat: sql<number>`coalesce(sum(${meals.fat}), 0)::int`,
      })
      .from(meals)
      .where(where),
  ]);

  return { items, limit, offset, total: totals?.total ?? 0, aggregate: totals };
}

export async function getMeal(profileId: number, id: number) {
  const [row] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.profileId, profileId)))
    .limit(1);
  if (!row) throw ApiError.notFound("Meal");
  return row;
}

export async function createMeal(profileId: number, values: Omit<typeof meals.$inferInsert, "profileId">) {
  const [row] = await db.insert(meals).values({ ...values, profileId }).returning();
  return row;
}

export async function updateMeal(profileId: number, id: number, patch: Partial<typeof meals.$inferInsert>) {
  await getMeal(profileId, id);
  if (Object.keys(patch).length === 0) return getMeal(profileId, id);
  const [row] = await db
    .update(meals)
    .set(patch)
    .where(and(eq(meals.id, id), eq(meals.profileId, profileId)))
    .returning();
  return row;
}

export async function deleteMeal(profileId: number, id: number) {
  const rows = await db
    .delete(meals)
    .where(and(eq(meals.id, id), eq(meals.profileId, profileId)))
    .returning({ id: meals.id });
  if (rows.length === 0) throw ApiError.notFound("Meal");
}

/* ------------------------------ daily logs ------------------------------ */

export async function listLogs(profileId: number, from?: string, to?: string, days?: number) {
  const end = to ?? todayISO();
  const start = from ?? addDays(end, -((days ?? 30) - 1));
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(
      and(eq(dailyLogs.profileId, profileId), gte(dailyLogs.logDate, start), lte(dailyLogs.logDate, end)),
    )
    .orderBy(asc(dailyLogs.logDate));
  return { items: rows, from: start, to: end };
}

export async function getLog(profileId: number, logDate: string) {
  const [row] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.profileId, profileId), eq(dailyLogs.logDate, logDate)))
    .limit(1);
  return row ?? null;
}

export async function upsertLog(
  profileId: number,
  logDate: string,
  patch: Partial<typeof dailyLogs.$inferInsert>,
) {
  if (Object.keys(patch).length === 0) throw ApiError.badRequest("Provide at least one metric to update");
  const [row] = await db
    .insert(dailyLogs)
    .values({ profileId, logDate, ...patch })
    .onConflictDoUpdate({ target: [dailyLogs.profileId, dailyLogs.logDate], set: patch })
    .returning();
  return row;
}

export async function adjustWater(profileId: number, logDate: string, amountMl: number) {
  const [row] = await db
    .insert(dailyLogs)
    .values({ profileId, logDate, waterMl: Math.max(0, amountMl) })
    .onConflictDoUpdate({
      target: [dailyLogs.profileId, dailyLogs.logDate],
      set: { waterMl: sql`greatest(0, least(10000, ${dailyLogs.waterMl} + ${amountMl}))` },
    })
    .returning();
  return row;
}

/* ------------------------------- exercises ------------------------------ */

export type ExerciseFilters = {
  q?: string;
  category?: string;
  muscleGroup?: string;
  equipment?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
};

export async function listExercises(filters: ExerciseFilters) {
  const conditions: SQL[] = [];
  if (filters.category) conditions.push(eq(exercises.category, filters.category));
  if (filters.muscleGroup) conditions.push(eq(exercises.muscleGroup, filters.muscleGroup));
  if (filters.equipment) conditions.push(eq(exercises.equipment, filters.equipment));
  if (filters.difficulty) conditions.push(eq(exercises.difficulty, filters.difficulty));
  if (filters.q) {
    const like = `%${filters.q}%`;
    const search = or(
      ilike(exercises.name, like),
      ilike(exercises.muscleGroup, like),
      ilike(exercises.equipment, like),
    );
    if (search) conditions.push(search);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const { limit, offset } = page(filters.limit, filters.offset);

  const [items, [totals]] = await Promise.all([
    db
      .select()
      .from(exercises)
      .where(where)
      .orderBy(asc(exercises.category), asc(exercises.name))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(exercises).where(where),
  ]);

  return { items, limit, offset, total: totals?.total ?? 0 };
}

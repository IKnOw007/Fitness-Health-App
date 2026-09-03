import type { dailyLogs, exercises, goals, meals, profiles, users, workouts } from "@/db/schema";

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export function serializeWorkout(w: Row<typeof workouts>) {
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

export function serializeMeal(m: Row<typeof meals>) {
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

export function serializeLog(l: Row<typeof dailyLogs>) {
  return {
    date: l.logDate,
    steps: l.steps,
    waterMl: l.waterMl,
    sleepHours: l.sleepHours,
    restingHr: l.restingHr,
    weightKg: l.weightKg ?? null,
    mood: l.mood,
  };
}

export function serializeProfile(p: Row<typeof profiles>) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    heightCm: p.heightCm,
    startWeightKg: p.startWeightKg,
    activityLevel: p.activityLevel,
    createdAt: p.createdAt.toISOString(),
  };
}

export function serializeGoals(g: Row<typeof goals>) {
  return {
    calorieTarget: g.calorieTarget,
    burnTarget: g.burnTarget,
    proteinTarget: g.proteinTarget,
    stepTarget: g.stepTarget,
    waterTargetMl: g.waterTargetMl,
    sleepTargetHours: g.sleepTargetHours,
    activeMinutesTarget: g.activeMinutesTarget,
    workoutsPerWeek: g.workoutsPerWeek,
    weightTargetKg: g.weightTargetKg,
  };
}

export function serializeExercise(e: Row<typeof exercises>) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    muscleGroup: e.muscleGroup,
    equipment: e.equipment,
    difficulty: e.difficulty,
    metValue: e.metValue,
    description: e.description,
  };
}

export function serializeUser(u: Row<typeof users>) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

import { addDays, lastNDates, toISODate, todayISO } from "@/lib/date";
import { buildInsights, type Insight } from "@/lib/insights";
import type { DailyLogDTO, MealDTO, WorkoutDTO } from "@/lib/data";
import { ensureGoals, listLogs, listMeals, listWorkouts } from "@/server/repo";
import { serializeGoals, serializeLog, serializeMeal, serializeWorkout } from "@/server/serialize";

function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(999, Math.round((value / target) * 100));
}

async function loadWindow(profileId: number, days: number) {
  const to = todayISO();
  const from = addDays(to, -(days - 1));
  const [goal, logs, workouts, meals] = await Promise.all([
    ensureGoals(profileId),
    listLogs(profileId, from, to),
    listWorkouts(profileId, { from, to, limit: 500 }),
    listMeals(profileId, { from, to, limit: 1000 }),
  ]);
  return {
    goal: serializeGoals(goal),
    logs: logs.items.map(serializeLog),
    workouts: workouts.items.map(serializeWorkout),
    meals: meals.items.map(serializeMeal),
    from,
    to,
  };
}

export async function dailySummary(profileId: number, date = todayISO()) {
  const [goal, log, workoutsRes, mealsRes] = await Promise.all([
    ensureGoals(profileId),
    listLogs(profileId, date, date),
    listWorkouts(profileId, { from: date, to: date, limit: 200 }),
    listMeals(profileId, { from: date, to: date, limit: 200 }),
  ]);

  const goals = serializeGoals(goal);
  const dayLog = log.items[0] ? serializeLog(log.items[0]) : null;
  const burned = workoutsRes.aggregate?.calories ?? 0;
  const activeMinutes = workoutsRes.aggregate?.minutes ?? 0;
  const intake = {
    calories: mealsRes.aggregate?.calories ?? 0,
    protein: mealsRes.aggregate?.protein ?? 0,
    carbs: mealsRes.aggregate?.carbs ?? 0,
    fat: mealsRes.aggregate?.fat ?? 0,
  };
  const steps = dayLog?.steps ?? 0;
  const water = dayLog?.waterMl ?? 0;

  const rings = {
    move: { value: burned, target: goals.burnTarget, percent: pct(burned, goals.burnTarget) },
    exercise: {
      value: activeMinutes,
      target: goals.activeMinutesTarget,
      percent: pct(activeMinutes, goals.activeMinutesTarget),
    },
    steps: { value: steps, target: goals.stepTarget, percent: pct(steps, goals.stepTarget) },
  };

  return {
    date,
    goals,
    rings,
    completion: Math.round((rings.move.percent + rings.exercise.percent + rings.steps.percent) / 3),
    activity: {
      workouts: workoutsRes.total,
      activeMinutes,
      caloriesBurned: burned,
      steps,
    },
    nutrition: {
      ...intake,
      caloriesRemaining: goals.calorieTarget + burned - intake.calories,
      proteinPercent: pct(intake.protein, goals.proteinTarget),
    },
    hydration: { waterMl: water, target: goals.waterTargetMl, percent: pct(water, goals.waterTargetMl) },
    body: {
      weightKg: dayLog?.weightKg ?? null,
      restingHr: dayLog?.restingHr ?? null,
      sleepHours: dayLog?.sleepHours ?? null,
      mood: dayLog?.mood ?? null,
    },
    sessions: workoutsRes.items.map(serializeWorkout),
  };
}

export async function trends(profileId: number, days = 30) {
  const { goal, logs, workouts, meals, from, to } = await loadWindow(profileId, days);

  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const workoutsByDate = new Map<string, WorkoutDTO[]>();
  for (const w of workouts) {
    const key = toISODate(new Date(w.performedAt));
    workoutsByDate.set(key, [...(workoutsByDate.get(key) ?? []), w]);
  }
  const mealsByDate = new Map<string, MealDTO[]>();
  for (const m of meals) {
    const key = toISODate(new Date(m.consumedAt));
    mealsByDate.set(key, [...(mealsByDate.get(key) ?? []), m]);
  }

  const series = lastNDates(days).map((date) => {
    const dayWorkouts = workoutsByDate.get(date) ?? [];
    const dayMeals = mealsByDate.get(date) ?? [];
    const log = logByDate.get(date);
    return {
      date,
      steps: log?.steps ?? 0,
      sleepHours: log?.sleepHours ?? 0,
      restingHr: log?.restingHr ?? null,
      weightKg: log?.weightKg ?? null,
      waterMl: log?.waterMl ?? 0,
      workouts: dayWorkouts.length,
      activeMinutes: dayWorkouts.reduce((s, w) => s + w.durationMin, 0),
      caloriesBurned: dayWorkouts.reduce((s, w) => s + w.calories, 0),
      caloriesIn: dayMeals.reduce((s, m) => s + m.calories, 0),
      protein: dayMeals.reduce((s, m) => s + m.protein, 0),
    };
  });

  const avg = (pick: (row: (typeof series)[number]) => number) =>
    Math.round((series.reduce((s, row) => s + pick(row), 0) / Math.max(1, series.length)) * 10) / 10;

  const weights = series.filter((s) => s.weightKg != null);
  const firstWeight = weights[0]?.weightKg ?? null;
  const lastWeight = weights[weights.length - 1]?.weightKg ?? null;

  return {
    range: { from, to, days },
    goals: goal,
    series,
    averages: {
      steps: avg((r) => r.steps),
      sleepHours: avg((r) => r.sleepHours),
      caloriesIn: avg((r) => r.caloriesIn),
      caloriesBurned: avg((r) => r.caloriesBurned),
      protein: avg((r) => r.protein),
      activeMinutes: avg((r) => r.activeMinutes),
    },
    totals: {
      workouts: workouts.length,
      activeMinutes: series.reduce((s, r) => s + r.activeMinutes, 0),
      caloriesBurned: series.reduce((s, r) => s + r.caloriesBurned, 0),
    },
    weight: {
      start: firstWeight,
      current: lastWeight,
      changeKg:
        firstWeight != null && lastWeight != null
          ? Math.round((lastWeight - firstWeight) * 10) / 10
          : null,
      target: goal.weightTargetKg,
    },
  };
}

export async function insightsFor(profileId: number): Promise<Insight[]> {
  const { goal, logs, workouts, meals } = await loadWindow(profileId, 14);
  const filled: DailyLogDTO[] = lastNDates(14).map((date) => {
    const found = logs.find((l) => l.date === date);
    return {
      logDate: date,
      steps: found?.steps ?? 0,
      waterMl: found?.waterMl ?? 0,
      sleepHours: found?.sleepHours ?? 0,
      restingHr: found?.restingHr ?? 0,
      weightKg: found?.weightKg ?? null,
      mood: found?.mood ?? "good",
    };
  });
  return buildInsights({ logs: filled, workouts, meals, goal });
}

import type { DailyLogDTO, GoalDTO, MealDTO, WorkoutDTO } from "@/lib/data";
import { macroTotals } from "@/lib/data";
import { toISODate, todayISO } from "@/lib/date";

export type Insight = {
  icon: string;
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
};

type Args = {
  logs: DailyLogDTO[];
  workouts: WorkoutDTO[];
  meals: MealDTO[];
  goal: GoalDTO;
};

export function buildInsights({ logs, workouts, meals, goal }: Args): Insight[] {
  const insights: Insight[] = [];
  const today = todayISO();
  const last7 = logs.slice(-7);
  const prev7 = logs.slice(-14, -7);

  const avg = (arr: DailyLogDTO[], pick: (l: DailyLogDTO) => number) =>
    arr.length ? arr.reduce((s, l) => s + pick(l), 0) / arr.length : 0;

  // Sleep
  const sleepAvg = avg(last7, (l) => l.sleepHours);
  if (sleepAvg > 0 && sleepAvg < goal.sleepTargetHours - 0.75) {
    insights.push({
      icon: "😴",
      title: "Sleep debt is building",
      body: `You averaged ${sleepAvg.toFixed(1)} h against a ${goal.sleepTargetHours} h goal. Aim for one extra sleep cycle tonight — recovery drives adaptation.`,
      tone: "warn",
    });
  } else if (sleepAvg >= goal.sleepTargetHours) {
    insights.push({
      icon: "🌙",
      title: "Recovery is dialled in",
      body: `${sleepAvg.toFixed(1)} h average sleep this week. Great base for pushing intensity in your next block.`,
      tone: "good",
    });
  }

  // Steps trend
  const stepsNow = avg(last7, (l) => l.steps);
  const stepsBefore = avg(prev7, (l) => l.steps);
  if (stepsBefore > 0) {
    const delta = Math.round(((stepsNow - stepsBefore) / stepsBefore) * 100);
    if (delta <= -10) {
      insights.push({
        icon: "👟",
        title: "Daily movement dipped",
        body: `Steps are down ${Math.abs(delta)}% versus last week (${Math.round(stepsNow).toLocaleString()}/day). A 20-minute walk after lunch closes most of that gap.`,
        tone: "warn",
      });
    } else if (delta >= 10) {
      insights.push({
        icon: "📈",
        title: "Movement is trending up",
        body: `Steps up ${delta}% week over week — averaging ${Math.round(stepsNow).toLocaleString()} per day.`,
        tone: "good",
      });
    }
  }

  // Protein
  const todayMeals = meals.filter((m) => toISODate(new Date(m.consumedAt)) === today);
  const intake = macroTotals(todayMeals);
  if (intake.calories > 0 && intake.protein < goal.proteinTarget * 0.6) {
    insights.push({
      icon: "🥩",
      title: "Protein is lagging today",
      body: `${intake.protein} g of ${goal.proteinTarget} g logged. A shake plus a chicken or tofu portion covers the rest.`,
      tone: "info",
    });
  }

  // Training frequency
  const weekWorkouts = workouts.filter(
    (w) => (Date.now() - new Date(w.performedAt).getTime()) / 86400000 <= 7,
  );
  if (weekWorkouts.length >= goal.workoutsPerWeek) {
    insights.push({
      icon: "🏆",
      title: "Weekly training goal hit",
      body: `${weekWorkouts.length} sessions in the last 7 days — schedule a mobility or easy day to consolidate the work.`,
      tone: "good",
    });
  } else {
    const left = goal.workoutsPerWeek - weekWorkouts.length;
    insights.push({
      icon: "🎯",
      title: `${left} session${left === 1 ? "" : "s"} to hit your week`,
      body: `You've logged ${weekWorkouts.length} of ${goal.workoutsPerWeek}. Even a 25-minute circuit counts toward the target.`,
      tone: "info",
    });
  }

  // Hydration
  const todayLog = logs[logs.length - 1];
  if (todayLog && todayLog.waterMl < goal.waterTargetMl * 0.5) {
    insights.push({
      icon: "💧",
      title: "Top up your hydration",
      body: `${(todayLog.waterMl / 1000).toFixed(2)} L so far today. Keep a bottle on the desk and sip through the afternoon.`,
      tone: "warn",
    });
  }

  // Intensity balance
  const hard = weekWorkouts.filter((w) => w.intensity === "high").length;
  if (weekWorkouts.length >= 3 && hard / weekWorkouts.length > 0.7) {
    insights.push({
      icon: "⚠️",
      title: "Mostly high intensity",
      body: `${hard} of ${weekWorkouts.length} sessions were hard efforts. Swap one for zone 2 cardio to keep fatigue in check.`,
      tone: "warn",
    });
  }

  return insights.slice(0, 4);
}

import type { Metadata } from "next";
import { BarChart } from "@/components/Charts";
import { ExerciseLibrary } from "@/components/ExerciseLibrary";
import { WorkoutForm } from "@/components/WorkoutForm";
import { WorkoutList, type WorkoutRow } from "@/components/WorkoutList";
import { Card, CardHeader, PageHeader, StatTile, categoryMeta } from "@/components/ui";
import {
  computeStreak,
  getExercises,
  getLogs,
  getProfileContext,
  getWorkoutStats,
  getWorkoutsSince,
  groupByDay,
} from "@/lib/data";
import { lastNDates, relativeDay, shortDay, timeOfDay } from "@/lib/date";

export const metadata: Metadata = { title: "Workouts" };
export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const { profile, goal } = await getProfileContext();
  const [workouts, exercises, logs, allTime] = await Promise.all([
    getWorkoutsSince(profile.id, 60),
    getExercises(),
    getLogs(profile.id, 7),
    getWorkoutStats(profile.id),
  ]);

  const byDay = groupByDay(workouts, (w) => w.performedAt);
  const minutesSeries = lastNDates(14).map((iso) => ({
    label: shortDay(iso),
    value: (byDay.get(iso) ?? []).reduce((s, w) => s + w.durationMin, 0),
  }));

  const withinDays = (days: number) =>
    workouts.filter((w) => (Date.now() - new Date(w.performedAt).getTime()) / 86400000 <= days);
  const weekWorkouts = withinDays(7);
  const prevWeek = workouts.filter((w) => {
    const age = (Date.now() - new Date(w.performedAt).getTime()) / 86400000;
    return age > 7 && age <= 14;
  });
  const monthWorkouts = withinDays(30);

  const categoryTotals = new Map<string, { count: number; minutes: number; calories: number }>();
  for (const w of monthWorkouts) {
    const entry = categoryTotals.get(w.category) ?? { count: 0, minutes: 0, calories: 0 };
    entry.count += 1;
    entry.minutes += w.durationMin;
    entry.calories += w.calories;
    categoryTotals.set(w.category, entry);
  }
  const categoryRows = [...categoryTotals.entries()].sort((a, b) => b[1].minutes - a[1].minutes);
  const totalCatMinutes = categoryRows.reduce((s, [, v]) => s + v.minutes, 0) || 1;

  const history: WorkoutRow[] = workouts.slice(0, 30).map((w) => ({
    ...w,
    when: `${relativeDay(w.performedAt)} · ${timeOfDay(w.performedAt)}`,
  }));

  const bodyWeight = logs.findLast((l) => l.weightKg != null)?.weightKg ?? profile.startWeightKg;
  const longest = workouts.reduce((best, w) => (w.durationMin > best ? w.durationMin : best), 0);
  const weekMinutes = weekWorkouts.reduce((s, w) => s + w.durationMin, 0);
  const volumeTrend =
    prevWeek.length > 0
      ? ((weekMinutes - prevWeek.reduce((s, w) => s + w.durationMin, 0)) /
          prevWeek.reduce((s, w) => s + w.durationMin, 1)) *
        100
      : 0;

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Training"
        title="Workouts"
        subtitle="Log sessions, watch your weekly volume and browse the movement library."
        action={<WorkoutForm />}
      />

      <div className="grid gap-5 stagger sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="This week"
          value={weekWorkouts.length}
          unit={`/ ${goal.workoutsPerWeek}`}
          accent="lime"
          icon="📅"
          progress={{ value: weekWorkouts.length, max: goal.workoutsPerWeek }}
          hint={`${weekMinutes} minutes trained`}
        />
        <StatTile
          label="Current streak"
          value={computeStreak(workouts)}
          unit="days"
          accent="flame"
          icon="🔥"
          hint={`Longest single session ${longest} min`}
        />
        <StatTile
          label="30-day burn"
          value={monthWorkouts.reduce((s, w) => s + w.calories, 0).toLocaleString()}
          unit="kcal"
          accent="aqua"
          icon="⚡"
          trend={{ value: volumeTrend, label: "% volume" }}
          hint={`${monthWorkouts.length} sessions logged`}
        />
        <StatTile
          label="All-time"
          value={allTime.total}
          unit="sessions"
          accent="violet"
          icon="🏆"
          hint={`${Math.round(allTime.minutes / 60)} hours · ${allTime.calories.toLocaleString()} kcal`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Training volume" subtitle="Minutes per day, last 14 days" icon="📊" />
          <div className="px-5 pb-5 pt-4">
            <BarChart
              data={minutesSeries}
              color="#c9f658"
              target={goal.activeMinutesTarget}
              unit="min"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Split by discipline" subtitle="Last 30 days" icon="🧭" />
          <div className="space-y-3.5 px-5 py-5">
            {categoryRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/40">No sessions in the last 30 days.</p>
            ) : (
              <>
                {/* Stacked share bar */}
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  {categoryRows.map(([category, v]) => (
                    <div
                      key={category}
                      style={{
                        width: `${(v.minutes / totalCatMinutes) * 100}%`,
                        background: categoryMeta(category).color,
                      }}
                      title={`${categoryMeta(category).label}: ${v.minutes} min`}
                    />
                  ))}
                </div>

                <ul className="space-y-2.5">
                  {categoryRows.map(([category, v]) => {
                    const meta = categoryMeta(category);
                    const share = Math.round((v.minutes / totalCatMinutes) * 100);
                    return (
                      <li key={category} className="flex items-center gap-3">
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                          style={{ background: `${meta.color}1c` }}
                          aria-hidden
                        >
                          {meta.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white/85">{meta.label}</p>
                          <p className="text-[11px] tabular-nums text-white/40">
                            {v.count} sessions · {v.minutes} min · {v.calories.toLocaleString()} kcal
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-sm font-black tabular-nums"
                          style={{ color: meta.color }}
                        >
                          {share}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="History"
          subtitle={`${history.length} most recent sessions`}
          icon="🗂️"
          action={<span className="chip">hover a row to delete</span>}
        />
        <WorkoutList workouts={history} />
      </Card>

      <Card>
        <CardHeader
          title="Exercise library"
          subtitle={`Calorie estimates personalised to ${bodyWeight.toFixed(1)} kg body weight`}
          icon="📚"
        />
        <ExerciseLibrary exercises={exercises} bodyWeightKg={bodyWeight} />
      </Card>
    </main>
  );
}

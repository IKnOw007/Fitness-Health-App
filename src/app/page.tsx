import Link from "next/link";
import { AreaChart, BarChart, MacroDonut } from "@/components/Charts";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { ActivityRings } from "@/components/Rings";
import { WaterTracker } from "@/components/WaterTracker";
import { WorkoutForm } from "@/components/WorkoutForm";
import { WorkoutList, type WorkoutRow } from "@/components/WorkoutList";
import { Badge, Card, CardHeader, PageHeader, ProgressBar, StatTile } from "@/components/ui";
import {
  computeStreak,
  getLogs,
  getMealsSince,
  getProfileContext,
  getWorkoutsSince,
  groupByDay,
  macroTotals,
} from "@/lib/data";
import { buildInsights } from "@/lib/insights";
import { prettyDate, relativeDay, shortDay, timeOfDay, toISODate, todayISO } from "@/lib/date";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const INSIGHT_TONE: Record<string, { ring: string; bg: string; text: string }> = {
  good: { ring: "border-lime/25", bg: "bg-lime/[0.07]", text: "text-lime" },
  warn: { ring: "border-flame/25", bg: "bg-flame/[0.07]", text: "text-flame" },
  info: { ring: "border-aqua/25", bg: "bg-aqua/[0.07]", text: "text-aqua" },
};

export default async function DashboardPage() {
  const { profile, goal } = await getProfileContext();
  const [logs, workouts, meals] = await Promise.all([
    getLogs(profile.id, 30),
    getWorkoutsSince(profile.id, 30),
    getMealsSince(profile.id, 7),
  ]);

  const today = todayISO();
  const todayLog = logs[logs.length - 1];
  const workoutsByDay = groupByDay(workouts, (w) => w.performedAt);
  const todayWorkouts = workoutsByDay.get(today) ?? [];
  const todayMeals = meals.filter((m) => toISODate(new Date(m.consumedAt)) === today);
  const intake = macroTotals(todayMeals);

  const burnedToday = todayWorkouts.reduce((sum, w) => sum + w.calories, 0);
  const activeToday = todayWorkouts.reduce((sum, w) => sum + w.durationMin, 0);
  const streak = computeStreak(workouts);

  const last7 = logs.slice(-7);
  const burnSeries = last7.map((l) => ({
    label: shortDay(l.logDate),
    value: (workoutsByDay.get(l.logDate) ?? []).reduce((s, w) => s + w.calories, 0),
  }));
  const stepSeries = last7.map((l) => ({ label: shortDay(l.logDate), value: l.steps }));
  const sleepSeries = logs.slice(-14).map((l) => ({ label: shortDay(l.logDate), value: l.sleepHours }));

  const weekWorkouts = workouts.filter(
    (w) => (Date.now() - new Date(w.performedAt).getTime()) / 86400000 <= 7,
  );
  const weekMinutes = weekWorkouts.reduce((s, w) => s + w.durationMin, 0);
  const weekBurn = weekWorkouts.reduce((s, w) => s + w.calories, 0);

  const weights = logs.filter((l) => l.weightKg != null);
  const currentWeight = weights.length ? (weights[weights.length - 1].weightKg as number) : profile.startWeightKg;
  const weight30Ago = weights.length ? (weights[0].weightKg as number) : currentWeight;
  const weightDelta = Math.round((currentWeight - weight30Ago) * 10) / 10;

  const sleep7 = logs.slice(-7);
  const avgSleep = sleep7.reduce((s, l) => s + l.sleepHours, 0) / Math.max(1, sleep7.length);
  const prevSleep = logs.slice(-14, -7);
  const avgSleepPrev = prevSleep.reduce((s, l) => s + l.sleepHours, 0) / Math.max(1, prevSleep.length);
  const sleepTrend = avgSleepPrev > 0 ? ((avgSleep - avgSleepPrev) / avgSleepPrev) * 100 : 0;

  const hrPoints = logs.slice(-14).filter((l) => l.restingHr > 0).map((l) => l.restingHr);

  const recent: WorkoutRow[] = workouts.slice(0, 5).map((w) => ({
    ...w,
    when: `${relativeDay(w.performedAt)} · ${timeOfDay(w.performedAt)}`,
  }));

  const remaining = goal.calorieTarget + burnedToday - intake.calories;
  const insights = buildInsights({ logs, workouts, meals, goal });

  const ringCompletion = Math.round(
    (Math.min(100, (burnedToday / goal.burnTarget) * 100) +
      Math.min(100, (activeToday / goal.activeMinutesTarget) * 100) +
      Math.min(100, ((todayLog?.steps ?? 0) / goal.stepTarget) * 100)) /
      3,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow={prettyDate(today)}
        title={`${greeting()}, ${profile.name.split(" ")[0]}`}
        subtitle={
          streak > 0
            ? `You're on a ${streak}-day training streak — ${ringCompletion}% of today's rings are closed.`
            : "No session logged today. Even 20 focused minutes starts a new streak."
        }
        action={
          <>
            {streak > 0 ? (
              <Badge tone="flame" dot>
                🔥 {streak} day streak
              </Badge>
            ) : null}
            <WorkoutForm />
          </>
        }
      />

      {/* Hero: rings + hydration + calories */}
      <div className="grid gap-5 stagger xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Today's activity"
            subtitle="Move · Exercise · Steps"
            icon="◎"
            action={
              <Badge tone={ringCompletion >= 100 ? "lime" : "neutral"}>
                {ringCompletion}% complete
              </Badge>
            }
          />
          <div className="px-5 py-6">
            <ActivityRings
              size={208}
              rings={[
                { label: "Move", value: burnedToday, target: goal.burnTarget, color: "#ff7d4d", unit: "kcal" },
                { label: "Exercise", value: activeToday, target: goal.activeMinutesTarget, color: "#c9f658", unit: "min" },
                { label: "Steps", value: todayLog?.steps ?? 0, target: goal.stepTarget, color: "#3ee6c4" },
              ]}
            />
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <WaterTracker initialMl={todayLog?.waterMl ?? 0} targetMl={goal.waterTargetMl} />
          <StatTile
            label="Calories remaining"
            value={remaining.toLocaleString()}
            unit="kcal"
            accent={remaining >= 0 ? "lime" : "flame"}
            icon="🔥"
            progress={{ value: intake.calories, max: goal.calorieTarget + burnedToday }}
            hint={`${intake.calories.toLocaleString()} eaten · ${burnedToday.toLocaleString()} burned · target ${goal.calorieTarget.toLocaleString()}`}
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-5 stagger sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="This week"
          value={weekWorkouts.length}
          unit={`/ ${goal.workoutsPerWeek} workouts`}
          accent="lime"
          icon="🏋️"
          progress={{ value: weekWorkouts.length, max: goal.workoutsPerWeek }}
          hint={`${weekMinutes} min · ${weekBurn.toLocaleString()} kcal burned`}
        />
        <StatTile
          label="Avg sleep (7d)"
          value={avgSleep.toFixed(1)}
          unit="hours"
          accent="violet"
          icon="😴"
          trend={{ value: sleepTrend }}
          spark={sleep7.map((l) => l.sleepHours)}
          hint={`Goal ${goal.sleepTargetHours} h · last night ${todayLog?.sleepHours ?? 0} h`}
        />
        <StatTile
          label="Resting HR"
          value={todayLog?.restingHr || "—"}
          unit="bpm"
          accent="aqua"
          icon="❤️"
          spark={hrPoints}
          hint="A downward trend signals better recovery"
        />
        <StatTile
          label="Weight"
          value={currentWeight.toFixed(1)}
          unit="kg"
          accent="flame"
          icon="⚖️"
          trend={{ value: weightDelta, label: " kg / 30d", goodWhenNegative: true }}
          spark={weights.map((l) => l.weightKg as number)}
          hint={`Goal ${goal.weightTargetKg} kg`}
        />
      </div>

      {/* Coach insights */}
      {insights.length > 0 ? (
        <Card>
          <CardHeader
            title="Coach insights"
            subtitle="Generated from your last 14 days"
            icon="🧠"
            action={<Badge tone="neutral">{insights.length} tips</Badge>}
          />
          <div className="grid gap-3 stagger px-5 py-5 sm:grid-cols-2">
            {insights.map((insight) => {
              const tone = INSIGHT_TONE[insight.tone];
              return (
                <article
                  key={insight.title}
                  className={`rounded-2xl border p-4 transition duration-300 hover:bg-white/[0.04] ${tone.ring} ${tone.bg}`}
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="text-base" aria-hidden>
                      {insight.icon}
                    </span>
                    {insight.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">{insight.body}</p>
                </article>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Calories burned" subtitle="Last 7 days vs daily goal" icon="🔥" />
          <div className="px-5 pb-5 pt-4">
            <BarChart data={burnSeries} color="#ff7d4d" target={goal.burnTarget} unit="kcal" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Steps" subtitle="Last 7 days vs daily goal" icon="👟" />
          <div className="px-5 pb-5 pt-4">
            <BarChart data={stepSeries} color="#3ee6c4" target={goal.stepTarget} />
          </div>
        </Card>
      </div>

      {/* Recent + macros */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent workouts"
            subtitle="Your last five sessions"
            icon="📋"
            action={
              <Link href="/workouts" className="text-xs font-bold text-lime transition hover:underline">
                View all →
              </Link>
            }
          />
          <WorkoutList workouts={recent} />
        </Card>

        <Card>
          <CardHeader
            title="Today's fuel"
            subtitle="Macro split from your diary"
            icon="🥗"
            action={
              <Link href="/nutrition" className="text-xs font-bold text-lime transition hover:underline">
                Diary →
              </Link>
            }
          />
          <div className="space-y-4 px-5 py-5">
            <MacroDonut protein={intake.protein} carbs={intake.carbs} fat={intake.fat} size={140} />
            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              <div>
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
                  <span className="text-white/50">Calories</span>
                  <span className="tabular-nums text-white/70">
                    {intake.calories} / {goal.calorieTarget}
                  </span>
                </div>
                <ProgressBar value={intake.calories} max={goal.calorieTarget} color="#c9f658" label="Calories" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
                  <span className="text-white/50">Protein</span>
                  <span className="tabular-nums text-white/70">
                    {intake.protein} / {goal.proteinTarget} g
                  </span>
                </div>
                <ProgressBar value={intake.protein} max={goal.proteinTarget} color="#3ee6c4" label="Protein" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sleep + check-in */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sleep rhythm" subtitle="Last 14 nights" icon="🌙" />
          <div className="px-5 pb-5 pt-4">
            <AreaChart data={sleepSeries} color="#a98bfa" target={goal.sleepTargetHours} unit="h" decimals={1} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Daily check-in" subtitle="Log steps, sleep, weight and mood" icon="✍️" />
          <DailyCheckIn
            logDate={today}
            steps={todayLog?.steps ?? 0}
            sleepHours={todayLog?.sleepHours ?? 0}
            restingHr={todayLog?.restingHr ?? 0}
            weightKg={todayLog?.weightKg ?? null}
            mood={todayLog?.mood ?? "good"}
            compact
          />
        </Card>
      </div>
    </main>
  );
}

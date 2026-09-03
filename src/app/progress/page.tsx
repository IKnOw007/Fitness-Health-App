import type { Metadata } from "next";
import { AreaChart, BarChart } from "@/components/Charts";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { Card, CardHeader, PageHeader, ProgressBar, StatTile } from "@/components/ui";
import { getLogs, getProfileContext, getWorkoutsSince, groupByDay } from "@/lib/data";
import { prettyDate, shortDay, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

const BMI_BANDS = [
  { max: 18.5, label: "Under", color: "#4cc4fb" },
  { max: 25, label: "Healthy", color: "#c9f658" },
  { max: 30, label: "Over", color: "#ff7d4d" },
  { max: 40, label: "Obese", color: "#f871a0" },
];

function bmiInfo(bmi: number) {
  const band = BMI_BANDS.find((b) => bmi < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
  return band;
}

export default async function ProgressPage() {
  const { profile, goal } = await getProfileContext();
  const [logs, workouts] = await Promise.all([
    getLogs(profile.id, 90),
    getWorkoutsSince(profile.id, 90),
  ]);

  const today = todayISO();
  const todayLog = logs[logs.length - 1];

  const weightPoints = logs
    .filter((l) => l.weightKg != null)
    .map((l) => ({ label: prettyDate(l.logDate), value: l.weightKg as number }));
  const currentWeight = weightPoints.length
    ? weightPoints[weightPoints.length - 1].value
    : profile.startWeightKg;
  const startWeight = profile.startWeightKg;
  const lost = Math.round((startWeight - currentWeight) * 10) / 10;
  const toGoal = Math.round((currentWeight - goal.weightTargetKg) * 10) / 10;
  const goalProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round(((startWeight - currentWeight) / Math.max(0.1, startWeight - goal.weightTargetKg)) * 100),
    ),
  );

  const heightM = profile.heightCm / 100;
  const bmi = Math.round((currentWeight / (heightM * heightM)) * 10) / 10;
  const band = bmiInfo(bmi);
  const bmiPosition = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));

  const sleepSeries = logs.slice(-14).map((l) => ({ label: shortDay(l.logDate), value: l.sleepHours }));
  const hrSeries = logs
    .slice(-30)
    .filter((l) => l.restingHr > 0)
    .map((l) => ({ label: prettyDate(l.logDate), value: l.restingHr }));
  const stepSeries = logs.slice(-30).map((l) => ({ label: prettyDate(l.logDate), value: l.steps }));

  const byDay = groupByDay(workouts, (w) => w.performedAt);
  const weeklyMinutes: { label: string; value: number }[] = [];
  for (let week = 11; week >= 0; week -= 1) {
    const slice = logs.slice(Math.max(0, logs.length - (week + 1) * 7), logs.length - week * 7);
    const minutes = slice.reduce(
      (sum, l) => sum + (byDay.get(l.logDate) ?? []).reduce((s, w) => s + w.durationMin, 0),
      0,
    );
    weeklyMinutes.push({ label: week === 0 ? "now" : `-${week}w`, value: minutes });
  }

  const last30 = logs.slice(-30);
  const avgSteps = Math.round(last30.reduce((s, l) => s + l.steps, 0) / Math.max(1, last30.length));
  const avgSleep = last30.reduce((s, l) => s + l.sleepHours, 0) / Math.max(1, last30.length);
  const avgHr = Math.round(hrSeries.reduce((s, p) => s + p.value, 0) / Math.max(1, hrSeries.length));
  const hrTrend =
    hrSeries.length > 6
      ? ((hrSeries.slice(-7).reduce((s, p) => s + p.value, 0) / 7 -
          hrSeries.slice(0, 7).reduce((s, p) => s + p.value, 0) / 7) /
          (hrSeries.slice(0, 7).reduce((s, p) => s + p.value, 0) / 7)) *
        100
      : 0;

  const bestStepDay = logs.reduce((best, l) => (l.steps > best.steps ? l : best), logs[0]);
  const longestWorkout = workouts.reduce(
    (best, w) => (w.durationMin > (best?.durationMin ?? 0) ? w : best),
    workouts[0],
  );
  const biggestBurn = workouts.reduce(
    (best, w) => (w.calories > (best?.calories ?? 0) ? w : best),
    workouts[0],
  );
  const bestSleep = logs.reduce((best, l) => (l.sleepHours > best.sleepHours ? l : best), logs[0]);

  const records = [
    {
      icon: "👟",
      label: "Most steps in a day",
      value: `${bestStepDay?.steps.toLocaleString() ?? 0} steps`,
      sub: bestStepDay ? prettyDate(bestStepDay.logDate) : "—",
      color: "#3ee6c4",
    },
    {
      icon: "⏱️",
      label: "Longest session",
      value: longestWorkout ? `${longestWorkout.durationMin} minutes` : "—",
      sub: longestWorkout?.title ?? "—",
      color: "#c9f658",
    },
    {
      icon: "🔥",
      label: "Biggest burn",
      value: biggestBurn ? `${biggestBurn.calories} kcal` : "—",
      sub: biggestBurn?.title ?? "—",
      color: "#ff7d4d",
    },
    {
      icon: "😴",
      label: "Best night of sleep",
      value: bestSleep ? `${bestSleep.sleepHours} hours` : "—",
      sub: bestSleep ? prettyDate(bestSleep.logDate) : "—",
      color: "#a98bfa",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Insights"
        title="Progress & body"
        subtitle="90 days of weight, sleep, heart rate and training volume trends."
        accent="violet"
      />

      <div className="grid gap-5 stagger sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Current weight"
          value={currentWeight.toFixed(1)}
          unit="kg"
          accent="lime"
          icon="⚖️"
          spark={weightPoints.slice(-20).map((p) => p.value)}
          hint={`${lost >= 0 ? "Down" : "Up"} ${Math.abs(lost).toFixed(1)} kg since start`}
        />
        <StatTile
          label="To goal"
          value={Math.abs(toGoal).toFixed(1)}
          unit="kg"
          accent="flame"
          icon="🎯"
          progress={{ value: goalProgress, max: 100 }}
          hint={`${goalProgress}% of the way to ${goal.weightTargetKg} kg`}
        />
        <StatTile
          label="BMI"
          value={bmi}
          accent="aqua"
          icon="🧬"
          hint={`${band.label} range · ${profile.heightCm} cm tall`}
        />
        <StatTile
          label="Avg resting HR"
          value={avgHr || "—"}
          unit="bpm"
          accent="violet"
          icon="❤️"
          trend={{ value: hrTrend, goodWhenNegative: true }}
          spark={hrSeries.map((p) => p.value)}
          hint={`30-day average · today ${todayLog?.restingHr ?? "—"}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Weight trend"
            subtitle="Daily weigh-ins with your goal line"
            icon="📉"
            action={<span className="chip">{goalProgress}% to goal</span>}
          />
          <div className="px-5 pb-5 pt-4">
            <AreaChart
              data={weightPoints}
              color="#c9f658"
              height={230}
              target={goal.weightTargetKg}
              unit="kg" decimals={1}
            />
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4 text-xs">
              <span className="text-white/45">
                Start <span className="font-bold tabular-nums text-white">{startWeight.toFixed(1)} kg</span>
              </span>
              <div className="min-w-[140px] flex-1">
                <ProgressBar value={goalProgress} max={100} color="#c9f658" label="Weight goal progress" />
              </div>
              <span className="text-white/45">
                Goal <span className="font-bold tabular-nums text-lime">{goal.weightTargetKg.toFixed(1)} kg</span>
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Body mass index" subtitle="Based on your latest weigh-in" icon="🧬" />
          <div className="px-5 py-6">
            <div className="text-center">
              <p className="stat-number text-[44px] leading-none" style={{ color: band.color }}>
                {bmi}
              </p>
              <p className="mt-1.5 text-sm font-bold text-white/70">{band.label} range</p>
            </div>

            <div className="relative mt-7">
              <div className="flex h-2.5 overflow-hidden rounded-full">
                {BMI_BANDS.map((b) => (
                  <div
                    key={b.label}
                    style={{
                      background: b.color,
                      opacity: b.label === band.label ? 1 : 0.28,
                      flex: b.label === "Under" ? 3.5 : b.label === "Healthy" ? 6.5 : b.label === "Over" ? 5 : 10,
                    }}
                  />
                ))}
              </div>
              <div
                className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded-full bg-white shadow-lg"
                style={{ left: `${bmiPosition}%`, height: 18, top: -4 }}
                aria-hidden
              />
              <div className="mt-2 flex justify-between text-[10px] font-semibold text-white/30">
                <span>15</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40</span>
              </div>
            </div>

            <dl className="mt-6 space-y-2 border-t border-white/[0.06] pt-4 text-xs">
              {[
                ["Height", `${profile.heightCm} cm`],
                ["Weight", `${currentWeight.toFixed(1)} kg`],
                ["Age", `${profile.age} years`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-white/40">{k}</dt>
                  <dd className="font-bold tabular-nums text-white/80">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sleep" subtitle={`14 nights · ${avgSleep.toFixed(1)} h average (30d)`} icon="😴" />
          <div className="px-5 pb-5 pt-4">
            <BarChart data={sleepSeries} color="#a98bfa" target={goal.sleepTargetHours} unit="h" decimals={1} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Resting heart rate" subtitle="Last 30 days · lower is better" icon="❤️" />
          <div className="px-5 pb-5 pt-4">
            <AreaChart data={hrSeries} color="#f871a0" unit="bpm" height={196} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Steps" subtitle={`30 days · ${avgSteps.toLocaleString()} daily average`} icon="👟" />
          <div className="px-5 pb-5 pt-4">
            <AreaChart
              data={stepSeries}
              color="#3ee6c4"
              target={goal.stepTarget}
              zeroBased
              
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Weekly training volume" subtitle="Minutes per week, last 12 weeks" icon="📊" />
          <div className="px-5 pb-5 pt-4">
            <BarChart
              data={weeklyMinutes}
              color="#ff7d4d"
              target={goal.activeMinutesTarget * goal.workoutsPerWeek}
              unit="min"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal records" subtitle="Highlights from the last 90 days" icon="🏆" />
          <ul className="divide-y divide-white/[0.06]">
            {records.map((pr) => (
              <li key={pr.label} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.03]">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-lg transition duration-300 group-hover:scale-110"
                  style={{ background: `${pr.color}18` }}
                  aria-hidden
                >
                  {pr.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="label">{pr.label}</p>
                  <p className="text-sm font-bold text-white" style={{ color: pr.color }}>
                    {pr.value}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-white/35">{pr.sub}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Check in for today" subtitle={prettyDate(today)} icon="✍️" />
          <DailyCheckIn
            logDate={today}
            steps={todayLog?.steps ?? 0}
            sleepHours={todayLog?.sleepHours ?? 0}
            restingHr={todayLog?.restingHr ?? 0}
            weightKg={todayLog?.weightKg ?? null}
            mood={todayLog?.mood ?? "good"}
          />
        </Card>
      </div>
    </main>
  );
}

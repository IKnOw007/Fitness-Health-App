import type { Metadata } from "next";
import { BarChart, MacroDonut } from "@/components/Charts";
import { MealComposer, MealList, type MealRow } from "@/components/MealTracker";
import { MiniRing } from "@/components/Rings";
import { Card, CardHeader, PageHeader, ProgressBar, StatTile } from "@/components/ui";
import {
  getMealsSince,
  getProfileContext,
  getWorkoutsSince,
  groupByDay,
  macroTotals,
} from "@/lib/data";
import { lastNDates, prettyDate, shortDay, timeOfDay, todayISO } from "@/lib/date";

export const metadata: Metadata = { title: "Nutrition" };
export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const { profile, goal } = await getProfileContext();
  const [meals, workouts] = await Promise.all([
    getMealsSince(profile.id, 14),
    getWorkoutsSince(profile.id, 14),
  ]);

  const today = todayISO();
  const mealsByDay = groupByDay(meals, (m) => m.consumedAt);
  const workoutsByDay = groupByDay(workouts, (w) => w.performedAt);
  const todayMeals = mealsByDay.get(today) ?? [];
  const totals = macroTotals(todayMeals);

  const burnedToday = (workoutsByDay.get(today) ?? []).reduce((s, w) => s + w.calories, 0);
  const remaining = goal.calorieTarget + burnedToday - totals.calories;

  const fatTarget = Math.round((goal.calorieTarget * 0.27) / 9);
  const carbTarget = Math.round((goal.calorieTarget - goal.proteinTarget * 4 - fatTarget * 9) / 4);

  const week = lastNDates(7);
  const intakeSeries = week.map((iso) => ({
    label: shortDay(iso),
    value: macroTotals(mealsByDay.get(iso) ?? []).calories,
  }));
  const proteinSeries = week.map((iso) => ({
    label: shortDay(iso),
    value: macroTotals(mealsByDay.get(iso) ?? []).protein,
  }));

  const daysWithFood = week.filter((iso) => (mealsByDay.get(iso) ?? []).length > 0);
  const avgCalories = Math.round(
    daysWithFood.reduce((s, iso) => s + macroTotals(mealsByDay.get(iso) ?? []).calories, 0) /
      Math.max(1, daysWithFood.length),
  );
  const avgProtein = Math.round(
    daysWithFood.reduce((s, iso) => s + macroTotals(mealsByDay.get(iso) ?? []).protein, 0) /
      Math.max(1, daysWithFood.length),
  );
  const proteinHitRate = Math.round(
    (week.filter((iso) => macroTotals(mealsByDay.get(iso) ?? []).protein >= goal.proteinTarget).length / 7) * 100,
  );

  const rows: MealRow[] = todayMeals.map((m) => ({ ...m, when: timeOfDay(m.consumedAt) }));

  const history = week
    .slice()
    .reverse()
    .map((iso) => {
      const t = macroTotals(mealsByDay.get(iso) ?? []);
      const burn = (workoutsByDay.get(iso) ?? []).reduce((s, w) => s + w.calories, 0);
      return { iso, ...t, burn, net: t.calories - burn };
    });

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Fuel"
        title="Nutrition diary"
        subtitle={`${prettyDate(today)} · ${todayMeals.length} item${todayMeals.length === 1 ? "" : "s"} logged today`}
        accent="aqua"
      />

      <div className="grid gap-5 stagger xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Today's energy balance" subtitle="Eaten vs burned vs target" icon="⚖️" />
          <div className="grid gap-6 px-5 py-6 lg:grid-cols-2">
            <MacroDonut protein={totals.protein} carbs={totals.carbs} fat={totals.fat} size={158} />

            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="label">Calories</span>
                  <span className="stat-number text-sm text-white">
                    {totals.calories.toLocaleString()}
                    <span className="text-[11px] font-semibold text-white/35">
                      {" / "}
                      {goal.calorieTarget.toLocaleString()}
                    </span>
                  </span>
                </div>
                <ProgressBar
                  value={totals.calories}
                  max={goal.calorieTarget}
                  color="#c9f658"
                  height={10}
                  label="Calories"
                />
                <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-white/45">
                  <span>🔥 {burnedToday} kcal burned</span>
                  <span aria-hidden>·</span>
                  <span className={remaining >= 0 ? "text-lime" : "text-flame"}>
                    {remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4">
                <MiniRing
                  value={totals.protein}
                  target={goal.proteinTarget}
                  color="#c9f658"
                  label="Protein"
                  sublabel={`${totals.protein}/${goal.proteinTarget}g`}
                />
                <MiniRing
                  value={totals.carbs}
                  target={carbTarget}
                  color="#3ee6c4"
                  label="Carbs"
                  sublabel={`${totals.carbs}/${carbTarget}g`}
                />
                <MiniRing
                  value={totals.fat}
                  target={fatTarget}
                  color="#ff7d4d"
                  label="Fat"
                  sublabel={`${totals.fat}/${fatTarget}g`}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <StatTile
            label="7-day average"
            value={avgCalories.toLocaleString()}
            unit="kcal / day"
            accent="aqua"
            icon="📊"
            spark={intakeSeries.map((p) => p.value)}
            hint={`${avgProtein} g protein per day on average`}
          />
          <StatTile
            label="Protein hit rate"
            value={`${proteinHitRate}%`}
            accent="lime"
            icon="🥩"
            progress={{ value: proteinHitRate, max: 100 }}
            hint={`Days at or above ${goal.proteinTarget} g this week`}
          />
        </div>
      </div>

      <Card>
        <CardHeader title="Add to today's diary" subtitle="One tap quick-add, or enter macros manually" icon="➕" />
        <MealComposer />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today's meals"
            subtitle="Grouped by meal time"
            icon="🍽️"
            action={
              <span className="stat-number text-sm text-lime">
                {totals.calories.toLocaleString()}
                <span className="text-[10px] font-semibold text-white/35"> kcal</span>
              </span>
            }
          />
          <MealList meals={rows} />
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Calories in" subtitle="Last 7 days vs target" icon="🔥" />
            <div className="px-5 pb-5 pt-4">
              <BarChart
                data={intakeSeries}
                color="#c9f658"
                target={goal.calorieTarget}
                unit="kcal"
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Protein" subtitle="Last 7 days vs target" icon="🥩" />
            <div className="px-5 pb-5 pt-4">
              <BarChart
                data={proteinSeries}
                color="#3ee6c4"
                target={goal.proteinTarget}
                unit="g"
              />
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Weekly log" subtitle="Daily intake, burn and net energy" icon="📅" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-[10.5px] uppercase tracking-wider text-white/40">
                <th scope="col" className="px-5 py-3 font-semibold">Day</th>
                <th scope="col" className="px-3 py-3 font-semibold">Calories</th>
                <th scope="col" className="px-3 py-3 font-semibold">Protein</th>
                <th scope="col" className="px-3 py-3 font-semibold">Carbs</th>
                <th scope="col" className="px-3 py-3 font-semibold">Fat</th>
                <th scope="col" className="px-3 py-3 font-semibold">Burned</th>
                <th scope="col" className="px-5 py-3 font-semibold">Net</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {history.map((row) => {
                const isToday = row.iso === today;
                return (
                  <tr
                    key={row.iso}
                    className={`border-b border-white/[0.05] transition last:border-0 hover:bg-white/[0.03] ${
                      isToday ? "bg-lime/[0.04]" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-semibold text-white/80">
                      {isToday ? <span className="text-lime">Today</span> : prettyDate(row.iso)}
                    </td>
                    <td className="px-3 py-3 font-bold text-white">{row.calories.toLocaleString()}</td>
                    <td className="px-3 py-3 text-lime">{row.protein} g</td>
                    <td className="px-3 py-3 text-aqua">{row.carbs} g</td>
                    <td className="px-3 py-3 text-flame">{row.fat} g</td>
                    <td className="px-3 py-3 text-white/55">{row.burn.toLocaleString()}</td>
                    <td className="px-5 py-3 font-bold text-white/80">{row.net.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}

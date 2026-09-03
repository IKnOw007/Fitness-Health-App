import type { Metadata } from "next";
import { GoalsForm } from "@/components/GoalsForm";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { getLogs, getProfileContext } from "@/lib/data";

export const metadata: Metadata = { title: "Goals" };
export const dynamic = "force-dynamic";

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  athlete: 1.9,
};

export default async function SettingsPage() {
  const { profile, goal } = await getProfileContext();
  const logs = await getLogs(profile.id, 14);
  const weight = logs.findLast((l) => l.weightKg != null)?.weightKg ?? profile.startWeightKg;

  const bmr = Math.round(10 * weight + 6.25 * profile.heightCm - 5 * profile.age + 5);
  const factor = ACTIVITY_FACTOR[profile.activityLevel] ?? 1.55;
  const maintenance = Math.round(bmr * factor);

  const guidance = [
    { label: "Basal metabolic rate", value: bmr, color: "#ffffff", note: "Calories burned at complete rest" },
    { label: "Maintenance", value: maintenance, color: "#3ee6c4", note: `Activity factor ×${factor}` },
    { label: "Fat loss", value: maintenance - 500, color: "#c9f658", note: "≈0.45 kg per week deficit" },
    { label: "Lean gain", value: maintenance + 350, color: "#ff7d4d", note: "Modest surplus for muscle" },
  ];

  const summary = [
    { icon: "🔥", label: "Calories", value: `${goal.calorieTarget.toLocaleString()} kcal` },
    { icon: "🥩", label: "Protein", value: `${goal.proteinTarget} g` },
    { icon: "👟", label: "Steps", value: goal.stepTarget.toLocaleString() },
    { icon: "💧", label: "Water", value: `${(goal.waterTargetMl / 1000).toFixed(1)} L` },
    { icon: "😴", label: "Sleep", value: `${goal.sleepTargetHours} h` },
    { icon: "⚡", label: "Burn", value: `${goal.burnTarget} kcal` },
    { icon: "⏱️", label: "Active min", value: `${goal.activeMinutesTarget} min` },
    { icon: "🏋️", label: "Workouts", value: `${goal.workoutsPerWeek} / week` },
    { icon: "⚖️", label: "Goal weight", value: `${goal.weightTargetKg} kg` },
    { icon: "🧬", label: "Activity", value: profile.activityLevel },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Personalise"
        title="Goals & profile"
        subtitle="Tune the targets that power your rings, charts and coaching tips."
      />

      <GoalsForm profile={profile} goal={goal} />

      <Card>
        <CardHeader
          title="Smart calorie guidance"
          subtitle={`Mifflin–St Jeor estimate at ${weight.toFixed(1)} kg, ${profile.heightCm} cm, ${profile.age} years`}
          icon="🧮"
        />
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
          {guidance.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.028] p-4 transition duration-300 hover:border-white/20 hover:bg-white/[0.055]"
            >
              <p className="label">{item.label}</p>
              <p className="stat-number mt-2 text-[26px] leading-none" style={{ color: item.color }}>
                {item.value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-[11px] text-white/40">{item.note}</p>
            </div>
          ))}
        </div>
        <p className="border-t border-white/[0.07] px-5 py-3.5 text-[11px] leading-relaxed text-white/35">
          Estimates only — adjust based on real-world progress over 2–3 weeks. PulseFit does not provide medical advice.
        </p>
      </Card>

      <Card>
        <CardHeader title="Current targets" subtitle="What your dashboard measures against" icon="🎯" />
        <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3 lg:grid-cols-5">
          {summary.map((t) => (
            <div
              key={t.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.028] p-3.5 transition duration-300 hover:border-white/20 hover:bg-white/[0.055]"
            >
              <p className="text-base" aria-hidden>
                {t.icon}
              </p>
              <p className="mt-1.5 label">{t.label}</p>
              <p className="mt-0.5 text-sm font-bold capitalize tabular-nums text-white">{t.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}

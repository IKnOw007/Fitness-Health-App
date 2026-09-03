"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Card, CardHeader } from "@/components/ui";
import type { GoalDTO, ProfileDTO } from "@/lib/data";

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", hint: "Desk job, little exercise" },
  { value: "light", label: "Light", hint: "1–2 sessions a week" },
  { value: "moderate", label: "Moderate", hint: "3–5 sessions a week" },
  { value: "high", label: "Very active", hint: "6–7 sessions a week" },
  { value: "athlete", label: "Athlete", hint: "Twice-daily training" },
];

const GOAL_GROUPS: {
  title: string;
  icon: string;
  fields: { key: keyof GoalDTO; label: string; step?: string; unit: string }[];
}[] = [
  {
    title: "Nutrition",
    icon: "🥗",
    fields: [
      { key: "calorieTarget", label: "Daily calories", unit: "kcal" },
      { key: "proteinTarget", label: "Daily protein", unit: "g" },
      { key: "waterTargetMl", label: "Water", unit: "ml" },
    ],
  },
  {
    title: "Activity",
    icon: "🏃",
    fields: [
      { key: "burnTarget", label: "Calories burned", unit: "kcal" },
      { key: "activeMinutesTarget", label: "Active minutes", unit: "min" },
      { key: "stepTarget", label: "Daily steps", unit: "steps" },
    ],
  },
  {
    title: "Recovery & body",
    icon: "🌙",
    fields: [
      { key: "sleepTargetHours", label: "Sleep", step: "0.5", unit: "hours" },
      { key: "workoutsPerWeek", label: "Workouts", unit: "/ week" },
      { key: "weightTargetKg", label: "Goal weight", step: "0.1", unit: "kg" },
    ],
  },
];

export function GoalsForm({ profile, goal }: { profile: ProfileDTO; goal: GoalDTO }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const initial = useMemo(
    () => ({
      name: profile.name,
      age: profile.age,
      heightCm: profile.heightCm,
      activityLevel: profile.activityLevel,
      ...goal,
    }),
    [profile, goal],
  );

  const [form, setForm] = useState(initial);
  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial],
  );

  function set(key: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Targets updated", "Your rings and charts now use the new goals.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not save targets", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Your profile" subtitle="Personalises BMI and calorie maths" icon="👤" />
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="label">Name</span>
              <input className="field mt-1.5" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Age</span>
                <input
                  type="number"
                  className="field mt-1.5 tabular-nums"
                  value={form.age}
                  onChange={(e) => set("age", Number(e.target.value))}
                />
              </label>
              <label className="block">
                <span className="label">Height (cm)</span>
                <input
                  type="number"
                  className="field mt-1.5 tabular-nums"
                  value={form.heightCm}
                  onChange={(e) => set("heightCm", Number(e.target.value))}
                />
              </label>
            </div>

            <fieldset>
              <legend className="label mb-2">Activity level</legend>
              <div className="space-y-1.5">
                {ACTIVITY_LEVELS.map((a) => {
                  const active = form.activityLevel === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => set("activityLevel", a.value)}
                      aria-pressed={active}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-lime/50 bg-lime/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      }`}
                    >
                      <span>
                        <span className={`block text-xs font-bold ${active ? "text-lime" : "text-white/75"}`}>
                          {a.label}
                        </span>
                        <span className="block text-[10.5px] text-white/35">{a.hint}</span>
                      </span>
                      <span
                        className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                          active ? "border-lime bg-lime" : "border-white/25"
                        }`}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </Card>

        <div className="grid gap-5 lg:col-span-2 lg:content-start">
          {GOAL_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader title={group.title} icon={group.icon} />
              <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
                {group.fields.map((f) => (
                  <label key={String(f.key)} className="block">
                    <span className="label">{f.label}</span>
                    <div className="relative mt-1.5">
                      <input
                        type="number"
                        step={f.step ?? "1"}
                        className="field pr-14 tabular-nums"
                        value={String(form[f.key])}
                        onChange={(e) => set(f.key, Number(e.target.value))}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-white/30">
                        {f.unit}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Sticky save bar appears only when there are unsaved edits */}
      <div
        className={`sticky bottom-24 z-30 transition-all duration-300 lg:bottom-6 ${
          dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-lime/25 bg-ink-850/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-semibold text-white/70">You have unsaved changes</p>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost !py-2" onClick={() => setForm(initial)}>
              Reset
            </button>
            <button type="submit" className="btn-primary !py-2" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

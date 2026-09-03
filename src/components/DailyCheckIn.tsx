"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type CheckInProps = {
  logDate: string;
  steps: number;
  sleepHours: number;
  restingHr: number;
  weightKg: number | null;
  mood: string;
  compact?: boolean;
};

const MOODS = [
  { value: "great", label: "Great", icon: "🤩" },
  { value: "good", label: "Good", icon: "🙂" },
  { value: "tired", label: "Tired", icon: "😴" },
  { value: "sore", label: "Sore", icon: "🥵" },
];

const FIELDS = [
  { key: "steps", label: "Steps", placeholder: "10000", step: "100", icon: "👟", suffix: "" },
  { key: "sleepHours", label: "Sleep", placeholder: "7.5", step: "0.1", icon: "😴", suffix: "h" },
  { key: "restingHr", label: "Resting HR", placeholder: "58", step: "1", icon: "❤️", suffix: "bpm" },
  { key: "weightKg", label: "Weight", placeholder: "78.4", step: "0.1", icon: "⚖️", suffix: "kg" },
] as const;

export function DailyCheckIn(props: CheckInProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const initial = useMemo(
    () => ({
      steps: String(props.steps || ""),
      sleepHours: String(props.sleepHours || ""),
      restingHr: String(props.restingHr || ""),
      weightKg: props.weightKg ? String(props.weightKg) : "",
      mood: props.mood,
    }),
    [props.steps, props.sleepHours, props.restingHr, props.weightKg, props.mood],
  );

  const [form, setForm] = useState(initial);
  const dirty = useMemo(
    () => (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]),
    [form, initial],
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logDate: props.logDate, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success("Check-in saved", "Your dashboard has been updated.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not save check-in", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-4 py-5 sm:px-5">
      <div className={`grid gap-3 ${props.compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="label flex items-center gap-1.5">
              <span aria-hidden>{f.icon}</span>
              {f.label}
            </span>
            <div className="relative mt-1.5">
              <input
                type="number"
                step={f.step}
                min={0}
                inputMode="decimal"
                className="field pr-9 tabular-nums"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
              {f.suffix ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/30">
                  {f.suffix}
                </span>
              ) : null}
            </div>
          </label>
        ))}
      </div>

      <fieldset>
        <legend className="label mb-2">How do you feel?</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {MOODS.map((m) => {
            const active = form.mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, mood: m.value })}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-bold transition ${
                  active
                    ? "border-lime/50 bg-lime/12 text-lime"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/25 hover:text-white"
                }`}
              >
                <span className={`text-lg leading-none transition ${active ? "scale-110" : ""}`} aria-hidden>
                  {m.icon}
                </span>
                {m.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving || !dirty}>
          {saving ? "Saving…" : dirty ? "Save check-in" : "Up to date"}
        </button>
        {dirty && !saving ? (
          <span className="text-[11px] font-semibold text-white/35">Unsaved changes</span>
        ) : null}
      </div>
    </form>
  );
}

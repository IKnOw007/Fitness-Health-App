"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { categoryMeta } from "@/components/ui";

const CATEGORIES = ["strength", "cardio", "hiit", "mobility", "core", "sport"] as const;
const INTENSITIES = [
  { value: "low", label: "Easy", hint: "Recovery pace" },
  { value: "medium", label: "Moderate", hint: "Steady effort" },
  { value: "high", label: "Hard", hint: "Near max" },
] as const;

const TEMPLATES = [
  { title: "Upper Body Strength", category: "strength", durationMin: 55, calories: 420, intensity: "high" },
  { title: "Lower Body Power", category: "strength", durationMin: 60, calories: 480, intensity: "high" },
  { title: "5K Run", category: "cardio", durationMin: 28, calories: 340, intensity: "high", distanceKm: 5 },
  { title: "Zone 2 Ride", category: "cardio", durationMin: 50, calories: 430, intensity: "low", distanceKm: 22 },
  { title: "HIIT Circuit", category: "hiit", durationMin: 25, calories: 330, intensity: "high" },
  { title: "Yoga Recovery", category: "mobility", durationMin: 40, calories: 160, intensity: "low" },
] as const;

function localDateTimeValue(d = new Date()) {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY = {
  title: "",
  category: "strength",
  durationMin: 45,
  calories: 350,
  intensity: "medium",
  distanceKm: "",
  notes: "",
  performedAt: localDateTimeValue(),
};

function WorkoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  }

  const isCardio = form.category === "cardio" || form.category === "sport";
  const pace = useMemo(() => {
    const km = Number(form.distanceKm);
    if (!km || !form.durationMin) return null;
    const secPerKm = (form.durationMin * 60) / km;
    return `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")} /km`;
  }, [form.distanceKm, form.durationMin]);

  function close() {
    setForm({ ...EMPTY, performedAt: localDateTimeValue() });
    setError(null);
    onClose();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Give your workout a name so you can find it later.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          distanceKm: form.distanceKm === "" ? 0 : Number(form.distanceKm),
          performedAt: new Date(form.performedAt).toISOString(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not save this workout.");
        return;
      }
      toast.success(
        "Workout logged",
        `${form.title} · ${form.durationMin} min · ${form.calories} kcal`,
      );
      close();
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Log a workout"
      description="Pick a template or fill in the details manually."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-[11px] text-white/35 sm:block">
            {pace ? `Pace ${pace}` : "Tip: templates prefill everything"}
          </p>
          <div className="flex flex-1 gap-2 sm:flex-none">
            <button type="button" className="btn-ghost flex-1 sm:flex-none" onClick={close}>
              Cancel
            </button>
            <button type="submit" form="workout-form" className="btn-primary flex-1 sm:flex-none" disabled={saving}>
              {saving ? "Saving…" : "Save workout"}
            </button>
          </div>
        </div>
      }
    >
      <form id="workout-form" onSubmit={submit} className="space-y-5">
        <div>
          <p className="label mb-2">Quick templates</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                className="chip-btn"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    title: t.title,
                    category: t.category,
                    durationMin: t.durationMin,
                    calories: t.calories,
                    intensity: t.intensity,
                    distanceKm: "distanceKm" in t && t.distanceKm ? String(t.distanceKm) : "",
                  }))
                }
              >
                <span aria-hidden>{categoryMeta(t.category).icon}</span>
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="label">Workout name</span>
          <input
            className="field mt-1.5"
            placeholder="Push day, tempo run, hill repeats…"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            autoComplete="off"
          />
        </label>

        <div>
          <span className="label">Category</span>
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {CATEGORIES.map((c) => {
              const meta = categoryMeta(c);
              const active = form.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[10.5px] font-bold capitalize transition ${
                    active
                      ? "border-transparent text-ink-950"
                      : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
                  }`}
                  style={active ? { background: meta.color } : undefined}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {meta.icon}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="label">Intensity</span>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {INTENSITIES.map((opt) => {
              const active = form.intensity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("intensity", opt.value)}
                  aria-pressed={active}
                  className={`rounded-xl border px-2 py-2 text-center transition ${
                    active
                      ? "border-lime/50 bg-lime/12 text-lime"
                      : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className="block text-xs font-bold">{opt.label}</span>
                  <span className="block text-[10px] opacity-60">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Duration (minutes)</span>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="field"
                value={form.durationMin}
                onChange={(e) => set("durationMin", Number(e.target.value))}
              />
              <div className="flex gap-1">
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("durationMin", m)}
                    className="rounded-lg bg-white/[0.06] px-2 py-2 text-[11px] font-bold text-white/55 transition hover:bg-white/15 hover:text-white"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </label>

          <label className="block">
            <span className="label">Calories burned</span>
            <input
              type="number"
              min={0}
              className="field mt-1.5"
              value={form.calories}
              onChange={(e) => set("calories", Number(e.target.value))}
            />
          </label>

          {isCardio ? (
            <label className="block">
              <span className="label">Distance (km)</span>
              <input
                type="number"
                step="0.1"
                min={0}
                className="field mt-1.5"
                placeholder="Optional"
                value={form.distanceKm}
                onChange={(e) => set("distanceKm", e.target.value)}
              />
              {pace ? <span className="mt-1 block text-[11px] text-aqua">Pace {pace}</span> : null}
            </label>
          ) : null}

          <label className="block">
            <span className="label">When</span>
            <input
              type="datetime-local"
              className="field mt-1.5"
              value={form.performedAt}
              onChange={(e) => set("performedAt", e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Notes</span>
          <input
            className="field mt-1.5"
            placeholder="How did it feel? Any PRs?"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-xl border border-flame/25 bg-flame/10 px-3 py-2 text-xs font-semibold text-flame">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

/** Primary CTA used in page headers. */
export function WorkoutForm({ label = "Log workout" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <span aria-hidden>＋</span> {label}
      </button>
      <WorkoutDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Floating action button shown on small screens. */
export function QuickLogFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Log a workout"
        className="fixed bottom-[86px] right-4 z-40 grid h-14 w-14 place-items-center rounded-2xl bg-lime text-2xl font-black text-ink-950 transition active:scale-95 lg:hidden"
        style={{ boxShadow: "0 14px 34px -10px rgba(201,246,88,0.9)" }}
      >
        ＋
      </button>
      <WorkoutDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

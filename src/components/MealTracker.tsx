"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/ui";
import type { MealDTO } from "@/lib/data";

export type MealRow = MealDTO & { when: string };

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_META: Record<string, { icon: string; label: string }> = {
  breakfast: { icon: "🌅", label: "Breakfast" },
  lunch: { icon: "🥙", label: "Lunch" },
  dinner: { icon: "🍽️", label: "Dinner" },
  snack: { icon: "🍎", label: "Snack" },
};

const QUICK_ADDS = [
  { name: "Whey protein shake", mealType: "snack", calories: 180, protein: 26, carbs: 8, fat: 3, icon: "🥤" },
  { name: "Chicken & rice bowl", mealType: "lunch", calories: 620, protein: 48, carbs: 66, fat: 16, icon: "🍚" },
  { name: "Greek yogurt & berries", mealType: "breakfast", calories: 320, protein: 26, carbs: 34, fat: 8, icon: "🫐" },
  { name: "Avocado toast & eggs", mealType: "breakfast", calories: 480, protein: 24, carbs: 38, fat: 26, icon: "🥑" },
  { name: "Salmon & greens", mealType: "dinner", calories: 610, protein: 44, carbs: 30, fat: 32, icon: "🐟" },
  { name: "Banana", mealType: "snack", calories: 105, protein: 1, carbs: 27, fat: 0, icon: "🍌" },
];

export function MealComposer() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    mealType: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const estimated = useMemo(() => {
    const p = Number(form.protein || 0);
    const c = Number(form.carbs || 0);
    const f = Number(form.fat || 0);
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [form.protein, form.carbs, form.fat]);

  async function save(payload: Record<string, unknown>, successLabel: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not save this meal.");
        toast.error("Could not add meal", data.error);
        return false;
      }
      toast.success("Added to diary", successLabel);
      startTransition(() => router.refresh());
      return true;
    } catch {
      setError("Network error — please retry.");
      toast.error("Network error", "Check your connection and retry.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Name your meal first.");
      return;
    }
    const calories = form.calories === "" ? estimated : Number(form.calories);
    const ok = await save(
      {
        ...form,
        calories,
        protein: Number(form.protein || 0),
        carbs: Number(form.carbs || 0),
        fat: Number(form.fat || 0),
        consumedAt: new Date().toISOString(),
      },
      `${form.name} · ${calories} kcal`,
    );
    if (ok) {
      setForm({ name: "", mealType: form.mealType, calories: "", protein: "", carbs: "", fat: "" });
      setExpanded(false);
    }
  }

  return (
    <div className="space-y-4 px-4 py-5 sm:px-5">
      <div>
        <p className="label mb-2">Quick add</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ADDS.map((q) => (
            <button
              key={q.name}
              type="button"
              disabled={saving}
              className="chip-btn hover:border-aqua/45 hover:bg-aqua/10 hover:text-aqua"
              onClick={() =>
                void save(
                  { ...q, consumedAt: new Date().toISOString() },
                  `${q.name} · ${q.calories} kcal`,
                )
              }
            >
              <span aria-hidden>{q.icon}</span>
              {q.name}
              <span className="tabular-nums opacity-50">{q.calories}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field sm:flex-1"
            placeholder="Or type a custom food…"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (e.target.value && !expanded) setExpanded(true);
            }}
            autoComplete="off"
          />
          <select
            className="field sm:w-40"
            value={form.mealType}
            onChange={(e) => setForm({ ...form, mealType: e.target.value })}
            aria-label="Meal type"
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEAL_META[t].label}
              </option>
            ))}
          </select>
        </div>

        {expanded ? (
          <div style={{ animation: "fade-up 0.3s ease-out both" }} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["calories", "Calories", "#c9f658"],
                  ["protein", "Protein g", "#c9f658"],
                  ["carbs", "Carbs g", "#3ee6c4"],
                  ["fat", "Fat g", "#ff7d4d"],
                ] as const
              ).map(([key, label, color]) => (
                <label key={key} className="block">
                  <span className="label" style={{ color: `${color}aa` }}>
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="field mt-1.5 tabular-nums"
                    placeholder={key === "calories" && estimated > 0 ? String(estimated) : "0"}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-white/40">
                {estimated > 0 ? (
                  <>
                    Macros total <span className="font-bold text-lime tabular-nums">{estimated} kcal</span>
                    {form.calories === "" ? " — used if calories left blank" : ""}
                  </>
                ) : (
                  "Leave calories blank to derive them from macros"
                )}
              </p>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Adding…" : "Add to diary"}
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-xs font-semibold text-flame">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

export function MealList({ meals }: { meals: MealRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  async function remove(m: MealRow) {
    setPending((prev) => new Set(prev).add(m.id));
    try {
      const res = await fetch(`/api/meals/${m.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.toast({
        title: "Meal removed",
        description: m.name,
        tone: "info",
        duration: 7000,
        action: {
          label: "Undo",
          onClick: async () => {
            await fetch("/api/meals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: m.name,
                mealType: m.mealType,
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fat: m.fat,
                consumedAt: m.consumedAt,
              }),
            });
            toast.success("Meal restored", m.name);
            startTransition(() => router.refresh());
          },
        },
      });
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not remove meal", "Please try again.");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
    }
  }

  if (meals.length === 0) {
    return (
      <EmptyState
        icon="🥗"
        title="Nothing logged today"
        hint="Use a quick-add chip above to fill your diary in one tap."
      />
    );
  }

  const grouped = MEAL_TYPES.map((type) => ({
    type,
    items: meals.filter((m) => m.mealType === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="divide-y divide-white/[0.06]">
      {grouped.map((group) => {
        const cals = group.items.reduce((sum, m) => sum + m.calories, 0);
        const protein = group.items.reduce((sum, m) => sum + m.protein, 0);
        return (
          <div key={group.type} className="px-4 py-3.5 sm:px-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
                <span className="text-sm" aria-hidden>
                  {MEAL_META[group.type].icon}
                </span>
                {MEAL_META[group.type].label}
                <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/40">
                  {group.items.length}
                </span>
              </p>
              <p className="text-[11px] font-bold tabular-nums text-white/55">
                {cals} kcal <span className="text-white/25">·</span>{" "}
                <span className="text-lime">{protein}g P</span>
              </p>
            </div>

            <ul className="mt-2 space-y-1.5">
              {group.items.map((m) => (
                <li
                  key={m.id}
                  className={`group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.028] px-3 py-2.5 transition ${
                    pending.has(m.id) ? "opacity-40" : "hover:border-white/15 hover:bg-white/[0.055]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                    <p className="text-[11px] tabular-nums text-white/40">
                      {m.when} · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                    </p>
                  </div>
                  <span className="shrink-0 stat-number text-sm text-lime">{m.calories}</span>
                  <button
                    onClick={() => void remove(m)}
                    disabled={pending.has(m.id)}
                    className="shrink-0 rounded-lg px-1.5 py-1 text-xs font-bold text-white/20 opacity-0 transition hover:bg-flame/12 hover:text-flame focus-visible:opacity-100 group-hover:opacity-100"
                    aria-label={`Remove ${m.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

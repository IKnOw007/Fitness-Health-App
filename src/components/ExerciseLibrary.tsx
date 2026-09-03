"use client";

import { useMemo, useState } from "react";
import { Badge, EmptyState, categoryMeta } from "@/components/ui";
import type { ExerciseDTO } from "@/lib/data";

export function ExerciseLibrary({
  exercises,
  bodyWeightKg,
}: {
  exercises: ExerciseDTO[];
  bodyWeightKg: number;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(exercises.map((e) => e.category)))],
    [exercises],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchesCategory = category === "all" || e.category === category;
      const matchesDifficulty = difficulty === "all" || e.difficulty === difficulty;
      const matchesQuery =
        q === "" ||
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        e.equipment.toLowerCase().includes(q);
      return matchesCategory && matchesDifficulty && matchesQuery;
    });
  }, [exercises, query, category, difficulty]);

  const hasFilters = query !== "" || category !== "all" || difficulty !== "all";

  function reset() {
    setQuery("");
    setCategory("all");
    setDifficulty("all");
  }

  return (
    <div className="px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/30" aria-hidden>
            🔍
          </span>
          <input
            className="field pl-9"
            placeholder="Search exercises, muscles or equipment…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the exercise library"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/35 hover:text-white"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => {
            const active = category === c;
            const meta = c === "all" ? null : categoryMeta(c);
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold capitalize transition ${
                  active
                    ? "border-transparent text-ink-950"
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/25 hover:text-white"
                }`}
                style={active ? { background: meta?.color ?? "#c9f658" } : undefined}
              >
                {meta ? <span aria-hidden>{meta.icon}</span> : null}
                {c}
              </button>
            );
          })}

          <span className="mx-1 hidden h-4 w-px bg-white/12 sm:block" aria-hidden />

          {["all", "beginner", "intermediate", "advanced"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              aria-pressed={difficulty === d}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-bold capitalize transition ${
                difficulty === d
                  ? "border-aqua/50 bg-aqua/12 text-aqua"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/25 hover:text-white"
              }`}
            >
              {d === "all" ? "any level" : d}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-white/35">
            Showing <span className="text-white/70 tabular-nums">{filtered.length}</span> of{" "}
            <span className="tabular-nums">{exercises.length}</span> movements
          </p>
          {hasFilters ? (
            <button onClick={reset} className="text-[11px] font-bold text-lime hover:underline">
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No exercises match that search"
          hint="Try a different muscle group, or clear your filters."
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => {
            const meta = categoryMeta(e.category);
            const burn30 = Math.round(e.metValue * bodyWeightKg * 0.5);
            return (
              <article
                key={e.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.028] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span
                  className="absolute inset-x-0 top-0 h-px opacity-0 transition duration-300 group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, transparent, ${meta.color}, transparent)` }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base"
                      style={{ background: `${meta.color}1c` }}
                      aria-hidden
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-white">{e.name}</h3>
                      <p className="truncate text-[11px] capitalize text-white/40">
                        {e.muscleGroup} · {e.equipment}
                      </p>
                    </div>
                  </div>
                  <Badge
                    tone={e.difficulty === "advanced" ? "flame" : e.difficulty === "beginner" ? "aqua" : "lime"}
                  >
                    {e.difficulty}
                  </Badge>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-white/50">{e.description}</p>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="text-[11px] font-semibold text-white/40">
                    ≈ <span className="tabular-nums" style={{ color: meta.color }}>{burn30} kcal</span> / 30 min
                  </span>
                  <span className="text-[10px] font-bold text-white/25 tabular-nums">MET {e.metValue}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

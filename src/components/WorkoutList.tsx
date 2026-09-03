"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Badge, EmptyState, categoryMeta } from "@/components/ui";
import type { WorkoutDTO } from "@/lib/data";

export type WorkoutRow = WorkoutDTO & { when: string };

export function WorkoutList({
  workouts,
  deletable = true,
  emptyHint,
}: {
  workouts: WorkoutRow[];
  deletable?: boolean;
  emptyHint?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  async function remove(w: WorkoutRow) {
    setPending((prev) => new Set(prev).add(w.id));
    try {
      const res = await fetch(`/api/workouts/${w.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");

      toast.toast({
        title: "Workout deleted",
        description: w.title,
        tone: "info",
        duration: 7000,
        action: {
          label: "Undo",
          onClick: async () => {
            await fetch("/api/workouts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: w.title,
                category: w.category,
                durationMin: w.durationMin,
                calories: w.calories,
                intensity: w.intensity,
                distanceKm: w.distanceKm ?? 0,
                notes: w.notes ?? "",
                performedAt: w.performedAt,
              }),
            });
            toast.success("Workout restored", w.title);
            startTransition(() => router.refresh());
          },
        },
      });
      startTransition(() => router.refresh());
    } catch {
      toast.error("Could not delete workout", "Please try again.");
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(w.id);
        return next;
      });
    }
  }

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon="🏋️"
        title="No workouts logged yet"
        hint={emptyHint ?? "Tap “Log workout” to record your first session and start a streak."}
      />
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06]">
      {workouts.map((w) => {
        const meta = categoryMeta(w.category);
        const busy = pending.has(w.id);
        return (
          <li
            key={w.id}
            className={`group flex items-center gap-3 px-4 py-3.5 transition duration-200 sm:px-5 ${
              busy ? "opacity-40" : "hover:bg-white/[0.035]"
            }`}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-lg transition duration-300 group-hover:scale-105"
              style={{ background: `${meta.color}1c`, boxShadow: `inset 0 0 0 1px ${meta.color}30` }}
              aria-hidden
            >
              {meta.icon}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{w.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-white/45">
                <span>{w.when}</span>
                <span aria-hidden>·</span>
                <span>{w.durationMin} min</span>
                <span aria-hidden>·</span>
                <span style={{ color: meta.color }}>{w.calories} kcal</span>
                {w.distanceKm ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{w.distanceKm} km</span>
                  </>
                ) : null}
              </p>
              {w.notes ? (
                <p className="mt-1 truncate text-[11px] italic text-white/32">“{w.notes}”</p>
              ) : null}
            </div>

            <div className="hidden shrink-0 sm:block">
              <Badge tone={w.intensity === "high" ? "flame" : w.intensity === "low" ? "aqua" : "lime"} dot>
                {w.intensity}
              </Badge>
            </div>

            {deletable ? (
              <button
                onClick={() => void remove(w)}
                disabled={busy}
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-white/25 opacity-0 transition hover:bg-flame/12 hover:text-flame focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                aria-label={`Delete ${w.title}`}
                title="Delete workout"
              >
                ✕
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

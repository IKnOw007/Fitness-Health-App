"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const GLASS = 250;

export function WaterTracker({ initialMl, targetMl }: { initialMl: number; targetMl: number }) {
  const router = useRouter();
  const toast = useToast();
  const [ml, setMl] = useState(initialMl);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const pct = Math.min(100, Math.round((ml / Math.max(1, targetMl)) * 100));
  const glasses = Math.max(1, Math.round(targetMl / GLASS));
  const filled = Math.min(glasses, Math.round(ml / GLASS));
  const reached = ml >= targetMl;

  async function change(amount: number) {
    const optimistic = Math.max(0, ml + amount);
    const wasBelow = ml < targetMl;
    setMl(optimistic);
    setBusy(true);
    try {
      const res = await fetch("/api/logs/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: amount }),
      });
      const data = (await res.json()) as { ok: boolean; waterMl?: number };
      if (data.ok && typeof data.waterMl === "number") {
        setMl(data.waterMl);
        if (wasBelow && data.waterMl >= targetMl) {
          toast.success("Hydration goal reached 💧", `${(data.waterMl / 1000).toFixed(2)} L today — nice work.`);
        }
      }
      startTransition(() => router.refresh());
    } catch {
      setMl(ml);
      toast.error("Could not update hydration", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-pad card-hover relative overflow-hidden">
      {/* Liquid fill background */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
        style={{
          height: `${pct}%`,
          background: "linear-gradient(180deg, rgba(76,196,251,0.16), rgba(76,196,251,0.05))",
        }}
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="label">Hydration</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="stat-number text-[30px] leading-none text-sky">{(ml / 1000).toFixed(2)}</span>
              <span className="text-xs font-semibold text-white/40">
                / {(targetMl / 1000).toFixed(1)} L
              </span>
            </p>
          </div>
          <span className="text-2xl" aria-hidden>
            {reached ? "🎉" : "💧"}
          </span>
        </div>

        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.09]"
          role="progressbar"
          aria-label="Hydration progress"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #4cc4fbaa, #4cc4fb)",
              boxShadow: "0 0 14px #4cc4fb55",
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
          {Array.from({ length: Math.min(glasses, 14) }).map((_, i) => (
            <span
              key={i}
              className="text-base transition duration-300"
              style={{
                opacity: i < filled ? 1 : 0.22,
                filter: i < filled ? "none" : "grayscale(1)",
                transform: i === filled - 1 ? "scale(1.15)" : "none",
              }}
            >
              🥤
            </span>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={() => void change(GLASS)}>
            + 250 ml
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => void change(500)}>
            + 500
          </button>
          <button
            className="btn-icon"
            disabled={busy || ml === 0}
            onClick={() => void change(-GLASS)}
            aria-label="Remove one glass"
            title="Remove 250 ml"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}

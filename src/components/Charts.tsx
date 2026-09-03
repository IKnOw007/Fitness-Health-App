"use client";

import { useId, useMemo, useState } from "react";

export type Point = { label: string; value: number; meta?: string };

/**
 * Charts are client components, so all props must be serializable —
 * formatting is described with `unit`/`decimals` rather than a callback.
 */
function formatNumber(value: number, unit?: string, decimals = 0): string {
  const n =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString();
  return unit ? `${n} ${unit}` : n;
}

function bounds(values: number[], target?: number, zeroBased = false) {
  const all = target !== undefined ? [...values, target] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (zeroBased) return { lo: 0, hi: max * 1.12 || 1 };
  if (min === max) return { lo: min - 1, hi: max + 1 };
  const pad = (max - min) * 0.14;
  return { lo: min - pad, hi: max + pad };
}

/* ------------------------------- Area chart ------------------------------- */

export function AreaChart({
  data,
  color = "#c9f658",
  height = 190,
  unit,
  decimals = 0,
  target,
  zeroBased = false,
}: {
  data: Point[];
  color?: string;
  height?: number;
  unit?: string;
  decimals?: number;
  target?: number;
  zeroBased?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    if (data.length === 0) return null;
    const width = 640;
    const padX = 10;
    const padTop = 16;
    const padBottom = 24;
    const values = data.map((d) => d.value);
    const { lo, hi } = bounds(values, target, zeroBased);
    const span = hi - lo || 1;
    const x = (i: number) => padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1);
    const y = (v: number) => padTop + (1 - (v - lo) / span) * (height - padTop - padBottom);
    const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.value)}`).join(" ");
    const area = `${line} L${x(data.length - 1)},${height - padBottom} L${x(0)},${height - padBottom} Z`;
    return { width, padX, padBottom, x, y, line, area };
  }, [data, target, zeroBased, height]);

  if (!geometry || data.length === 0) return null;
  const { width, padX, padBottom, x, y, line, area } = geometry;
  const fmt = (v: number) => formatNumber(v, unit, decimals);
  const active = hover ?? data.length - 1;
  const activePoint = data[active];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Trend chart, latest value ${fmt(data[data.length - 1].value)}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={16 + f * (height - 16 - padBottom)}
            y2={16 + f * (height - 16 - padBottom)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {target !== undefined ? (
          <>
            <line
              x1={padX}
              x2={width - padX}
              y1={y(target)}
              y2={y(target)}
              stroke="rgba(255,255,255,0.35)"
              strokeDasharray="5 6"
              strokeWidth={1.2}
            />
            <text x={width - padX} y={y(target) - 6} textAnchor="end" className="fill-white/40 text-[10px] font-semibold">
              goal
            </text>
          </>
        ) : null}

        <path d={area} fill={`url(#area-${uid})`} style={{ animation: "fade-in 0.7s ease-out both" }} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {hover !== null ? (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={12}
            y2={height - padBottom}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth={1}
          />
        ) : null}

        <circle cx={x(active)} cy={y(activePoint.value)} r={10} fill={color} fillOpacity={0.18} />
        <circle cx={x(active)} cy={y(activePoint.value)} r={4} fill={color} stroke="#05070c" strokeWidth={1.5} />

        {/* Invisible hover targets */}
        {data.map((d, i) => (
          <rect
            key={`${d.label}-${i}`}
            x={x(i) - (width - padX * 2) / (2 * Math.max(1, data.length - 1))}
            y={0}
            width={(width - padX * 2) / Math.max(1, data.length - 1)}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
          />
        ))}
      </svg>

      <div className="pointer-events-none mt-1 flex items-center justify-between text-[10px] font-semibold text-white/35">
        <span>{data[0].label}</span>
        <span
          className="rounded-md bg-white/[0.07] px-2 py-0.5 text-white/70 tabular-nums"
          style={{ color }}
        >
          {activePoint.label} · {fmt(activePoint.value)}
        </span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

/* -------------------------------- Bar chart ------------------------------- */

export function BarChart({
  data,
  color = "#3ee6c4",
  height = 176,
  target,
  unit,
  decimals = 0,
}: {
  data: Point[];
  color?: string;
  height?: number;
  target?: number;
  unit?: string;
  decimals?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const formatValue = (v: number) => formatNumber(v, unit, decimals);
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), target ?? 0, 1);
  const chartHeight = height - 28;
  const hitCount = data.filter((d) => target !== undefined && d.value >= target).length;

  return (
    <div>
      <div className="relative flex items-end justify-between gap-1.5" style={{ height: chartHeight }}>
        {target !== undefined ? (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/25"
            style={{ bottom: `${(target / max) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 rounded bg-ink-900/80 px-1 text-[9.5px] font-bold text-white/45">
              goal {formatValue(target)}
            </span>
          </div>
        ) : null}

        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const hit = target !== undefined && d.value >= target;
          const isHover = hover === i;
          return (
            <div
              key={`${d.label}-${i}`}
              className="group relative flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className="w-full origin-bottom rounded-t-lg transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 1.5)}%`,
                  background: hit
                    ? `linear-gradient(180deg, ${color}, ${color}55)`
                    : "linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.07))",
                  boxShadow: hit ? `0 0 16px ${color}44` : "none",
                  opacity: hover === null || isHover ? 1 : 0.45,
                  animation: `bar-grow 0.6s cubic-bezier(0.22,1,0.36,1) ${i * 35}ms both`,
                }}
              />
              {isHover ? (
                <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-850 px-2 py-1 text-[10px] font-bold text-white shadow-xl ring-1 ring-white/15">
                  {formatValue(d.value)}
                  <span className="ml-1 font-medium text-white/45">{d.label}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between gap-1.5">
        {data.map((d, i) => (
          <span
            key={`${d.label}-l-${i}`}
            className={`flex-1 text-center text-[10px] font-semibold uppercase tracking-wide transition ${
              hover === i ? "text-white" : "text-white/32"
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>

      {target !== undefined ? (
        <p className="mt-2.5 text-center text-[11px] font-semibold text-white/40">
          <span style={{ color }}>{hitCount}</span> of {data.length} days hit goal
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------ Macro donut ------------------------------- */

export function MacroDonut({
  protein,
  carbs,
  fat,
  size = 156,
}: {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}) {
  const parts = [
    { label: "Protein", cal: protein * 4, grams: protein, color: "#c9f658" },
    { label: "Carbs", cal: carbs * 4, grams: carbs, color: "#3ee6c4" },
    { label: "Fat", cal: fat * 9, grams: fat, color: "#ff7d4d" },
  ];
  const total = parts.reduce((s, p) => s + p.cal, 0);
  const stroke = 15;
  const center = size / 2;
  const radius = center - stroke / 2 - 1;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Macro split">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total > 0 &&
            parts.map((p, i) => {
              const len = (p.cal / total) * circumference;
              const el = (
                <circle
                  key={p.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${Math.max(len - 2.5, 0)} ${circumference}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  style={{ animation: `fade-in 0.5s ease-out ${i * 120}ms both` }}
                />
              );
              offset += len;
              return el;
            })}
        </g>
        <text x={center} y={center - 1} textAnchor="middle" className="fill-white font-display text-[19px] font-black tabular-nums">
          {Math.round(total)}
        </text>
        <text x={center} y={center + 15} textAnchor="middle" className="fill-white/35 text-[10px] font-bold uppercase tracking-wider">
          kcal
        </text>
      </svg>

      <div className="flex min-w-[150px] flex-1 flex-col gap-2.5">
        {parts.map((p) => {
          const share = total > 0 ? Math.round((p.cal / total) * 100) : 0;
          return (
            <div key={p.label}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-white/65">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                  {p.label}
                </span>
                <span className="text-sm font-bold tabular-nums text-white">
                  {Math.round(p.grams)}
                  <span className="text-[10px] font-medium text-white/35">g · {share}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${share}%`, background: p.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

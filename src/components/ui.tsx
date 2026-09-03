import type { ReactNode } from "react";

/* ------------------------------- Card shell ------------------------------- */

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <section className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</section>;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-sm"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-white">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-white/45">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --------------------------------- Stats --------------------------------- */

const ACCENTS = {
  lime: { text: "text-lime", hex: "#c9f658" },
  aqua: { text: "text-aqua", hex: "#3ee6c4" },
  flame: { text: "text-flame", hex: "#ff7d4d" },
  violet: { text: "text-grape", hex: "#a98bfa" },
  sky: { text: "text-sky", hex: "#4cc4fb" },
  rose: { text: "text-rose", hex: "#f871a0" },
} as const;

export type Accent = keyof typeof ACCENTS;

/** Tiny inline sparkline used inside stat tiles. */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const w = 100;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points.map((value, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((value - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const id = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${coords.join(" ")} ${w},${h}`} fill={`url(#${id})`} />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  accent = "lime",
  icon,
  trend,
  spark,
  progress,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  accent?: Accent;
  icon?: string;
  /** Percentage change; positive is rendered green-up unless `invert` semantics apply. */
  trend?: { value: number; label?: string; goodWhenNegative?: boolean };
  spark?: number[];
  progress?: { value: number; max: number };
}) {
  const tone = ACCENTS[accent];
  const trendPositive = trend ? (trend.goodWhenNegative ? trend.value < 0 : trend.value > 0) : false;
  const trendNeutral = trend ? Math.abs(trend.value) < 0.05 : false;

  return (
    <div className="card-pad card-hover group overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="label">{label}</p>
        {icon ? (
          <span
            className="text-base leading-none transition duration-300 group-hover:scale-110"
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`stat-number text-[30px] leading-none ${tone.text}`}>{value}</span>
        {unit ? <span className="text-xs font-semibold text-white/40">{unit}</span> : null}
      </div>

      {trend ? (
        <p
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
            trendNeutral
              ? "bg-white/8 text-white/50"
              : trendPositive
                ? "bg-lime/12 text-lime"
                : "bg-flame/12 text-flame"
          }`}
        >
          <span aria-hidden>{trendNeutral ? "→" : trend.value > 0 ? "↑" : "↓"}</span>
          {Math.abs(trend.value).toFixed(Math.abs(trend.value) < 10 ? 1 : 0)}
          {trend.label ? <span className="font-medium opacity-70">{trend.label}</span> : "%"}
        </p>
      ) : null}

      {progress ? (
        <div className="mt-3">
          <ProgressBar value={progress.value} max={progress.max} color={tone.hex} height={6} />
        </div>
      ) : null}

      {spark && spark.length > 1 ? (
        <div className="mt-3 -mb-1">
          <Sparkline points={spark} color={tone.hex} />
        </div>
      ) : null}

      {hint ? <p className="mt-2 text-[11px] leading-relaxed text-white/45">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------- Progress -------------------------------- */

export function ProgressBar({
  value,
  max,
  color = "#c9f658",
  height = 8,
  label,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-white/[0.09]"
      style={{ height }}
      role="progressbar"
      aria-label={label ?? "progress"}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          boxShadow: pct > 0 ? `0 0 14px ${color}55` : "none",
        }}
      />
    </div>
  );
}

/* --------------------------------- Badge --------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "lime" | "aqua" | "flame" | "violet";
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/12 bg-white/[0.06] text-white/70",
    lime: "border-lime/30 bg-lime/12 text-lime",
    aqua: "border-aqua/30 bg-aqua/12 text-aqua",
    flame: "border-flame/30 bg-flame/12 text-flame",
    violet: "border-grape/30 bg-grape/12 text-grape",
  };
  const dots: Record<string, string> = {
    neutral: "bg-white/50",
    lime: "bg-lime",
    aqua: "bg-aqua",
    flame: "bg-flame",
    violet: "bg-grape",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ${tones[tone]}`}
    >
      {dot ? <span className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------ Empty state ------------------------------ */

export function EmptyState({
  title,
  hint,
  icon = "✨",
  action,
}: {
  title: string;
  hint?: string;
  icon?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.05] text-2xl ring-1 ring-white/8"
        aria-hidden
      >
        {icon}
      </span>
      <p className="mt-1 text-sm font-bold text-white/80">{title}</p>
      {hint ? <p className="max-w-xs text-xs leading-relaxed text-white/40">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ------------------------------- Categories ------------------------------ */

export const CATEGORY_META: Record<string, { icon: string; color: string; label: string }> = {
  strength: { icon: "🏋️", color: "#c9f658", label: "Strength" },
  cardio: { icon: "🏃", color: "#3ee6c4", label: "Cardio" },
  hiit: { icon: "⚡", color: "#ff7d4d", label: "HIIT" },
  mobility: { icon: "🧘", color: "#a98bfa", label: "Mobility" },
  core: { icon: "🌀", color: "#4cc4fb", label: "Core" },
  sport: { icon: "⚽", color: "#f871a0", label: "Sport" },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? { icon: "💪", color: "#94a3b8", label: category };
}

/* ---------------------------- Page-level header --------------------------- */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  accent = "lime",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: Accent;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p
          className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] ${ACCENTS[accent].text}`}
        >
          <span
            className="h-1 w-6 rounded-full"
            style={{ background: ACCENTS[accent].hex }}
            aria-hidden
          />
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[28px] font-black leading-tight tracking-[-0.03em] text-white lg:text-[38px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

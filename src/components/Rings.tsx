type RingSpec = {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  icon?: string;
};

export function ActivityRings({ rings, size = 216 }: { rings: RingSpec[]; size?: number }) {
  const stroke = size * 0.072;
  const gap = stroke * 1.5;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="h-auto max-w-full"
          role="img"
          aria-label={rings
            .map((r) => `${r.label}: ${r.value} of ${r.target}`)
            .join(", ")}
        >
          <defs>
            <filter id="ringGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {rings.map((ring, i) => {
            const radius = center - stroke / 2 - i * gap - 3;
            const circumference = 2 * Math.PI * radius;
            const pct = ring.target > 0 ? Math.min(1, ring.value / ring.target) : 0;
            const dash = circumference * pct;
            return (
              <g key={ring.label} transform={`rotate(-90 ${center} ${center})`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeOpacity={0.14}
                  strokeWidth={stroke}
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  filter="url(#ringGlow)"
                  style={
                    {
                      "--ring-dash": `${dash}`,
                      "--ring-circ": `${circumference}`,
                      animation: `ring-fill 1.05s cubic-bezier(0.22,1,0.36,1) ${i * 130}ms both`,
                    } as React.CSSProperties
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="flex w-full min-w-0 flex-col gap-3.5">
        {rings.map((ring) => {
          const pct = ring.target > 0 ? Math.round((ring.value / ring.target) * 100) : 0;
          const complete = pct >= 100;
          return (
            <li key={ring.label} className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: ring.color, boxShadow: `0 0 10px ${ring.color}` }}
                    aria-hidden
                  />
                  <span className="label truncate">{ring.label}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                    complete ? "text-ink-950" : ""
                  }`}
                  style={
                    complete
                      ? { background: ring.color }
                      : { color: ring.color, background: `${ring.color}18` }
                  }
                >
                  {complete ? "✓ done" : `${pct}%`}
                </span>
              </div>
              <p className="mt-1 stat-number text-[19px] leading-none text-white">
                {ring.value.toLocaleString()}
                <span className="text-[11px] font-semibold text-white/32">
                  {" / "}
                  {ring.target.toLocaleString()} {ring.unit ?? ""}
                </span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full transition-[width] duration-1000 ease-out"
                  style={{ width: `${Math.min(100, pct)}%`, background: ring.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MiniRing({
  value,
  target,
  color,
  size = 78,
  label,
  sublabel,
}: {
  value: number;
  target: number;
  color: string;
  size?: number;
  label: string;
  sublabel?: string;
}) {
  const stroke = 7.5;
  const center = size / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${Math.round(pct * 100)}%`}>
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={stroke} />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={
              {
                "--ring-dash": `${dash}`,
                "--ring-circ": `${circumference}`,
                animation: "ring-fill 0.9s cubic-bezier(0.22,1,0.36,1) both",
              } as React.CSSProperties
            }
          />
        </g>
        <text x={center} y={center + 4} textAnchor="middle" className="fill-white text-[13px] font-black tabular-nums">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="text-center">
        <p className="text-[11px] font-bold text-white/65">{label}</p>
        {sublabel ? <p className="text-[10px] tabular-nums text-white/35">{sublabel}</p> : null}
      </div>
    </div>
  );
}

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export function lastNDates(n: number, endISO = todayISO()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(endISO, -i));
  return out;
}

export function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", { weekday: "short" });
}

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function timeOfDay(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function relativeDay(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const iso = toISODate(d);
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return prettyDate(iso);
}

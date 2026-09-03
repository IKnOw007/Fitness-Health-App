import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export async function currentProfileId(): Promise<number> {
  await ensureSeeded();
  const [profile] = await db.select().from(profiles).orderBy(profiles.id).limit(1);
  return profile.id;
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function int(value: unknown, fallback = 0): number {
  return Math.round(num(value, fallback));
}

export function str(value: unknown, fallback = ""): string {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function badRequest(message: string) {
  return Response.json({ ok: false, error: message }, { status: 400 });
}

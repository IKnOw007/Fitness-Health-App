import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, exercises, goals, meals, profiles, users, workouts } from "@/db/schema";
import { addDays, todayISO } from "@/lib/date";
import { hashPassword } from "@/server/auth";

export const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@pulsefit.app";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "pulsefit123";

let seedPromise: Promise<void> | null = null;

/** Deterministic pseudo-random so the demo data is stable across restarts. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const EXERCISE_LIBRARY = [
  ["Barbell Back Squat", "strength", "legs", "barbell", "intermediate", 6, "King of lower-body lifts. Brace the core, drive through mid-foot."],
  ["Romanian Deadlift", "strength", "hamstrings", "barbell", "intermediate", 6, "Hinge at the hips with a flat back to load the posterior chain."],
  ["Bench Press", "strength", "chest", "barbell", "intermediate", 5.5, "Retract the shoulder blades and keep the bar path over the sternum."],
  ["Pull Up", "strength", "back", "bodyweight", "advanced", 8, "Full hang to chin over bar. Add a band if you need assistance."],
  ["Overhead Press", "strength", "shoulders", "barbell", "intermediate", 5, "Squeeze glutes, press the bar straight overhead, finish with biceps by ears."],
  ["Dumbbell Row", "strength", "back", "dumbbell", "beginner", 5, "Row toward the hip, pause a beat at the top."],
  ["Goblet Squat", "strength", "legs", "kettlebell", "beginner", 5, "Great squat pattern teacher. Elbows inside the knees at the bottom."],
  ["Hip Thrust", "strength", "glutes", "barbell", "beginner", 5, "Chin tucked, ribs down, full lockout squeeze at the top."],
  ["Push Up", "strength", "chest", "bodyweight", "beginner", 4, "Body in one straight line, elbows at 45 degrees."],
  ["Plank", "core", "core", "bodyweight", "beginner", 3, "Stack shoulders over elbows, squeeze glutes, breathe."],
  ["Hanging Leg Raise", "core", "core", "bodyweight", "advanced", 4.5, "Control the descent, avoid swinging."],
  ["Russian Twist", "core", "core", "medicine ball", "beginner", 4, "Rotate from the ribcage, keep the chest tall."],
  ["Treadmill Run", "cardio", "full body", "machine", "beginner", 9.8, "Steady state or intervals. Keep cadence near 175 spm."],
  ["Outdoor Run", "cardio", "full body", "none", "beginner", 10, "Fresh air miles. Negative split the second half."],
  ["Cycling", "cardio", "legs", "bike", "beginner", 8, "Cadence 85-95 rpm for endurance work."],
  ["Rowing Machine", "cardio", "full body", "machine", "intermediate", 8.5, "Legs, hips, arms out. Arms, hips, legs back."],
  ["Jump Rope", "cardio", "calves", "rope", "intermediate", 11, "Small bounces, wrists do the work."],
  ["Swimming", "cardio", "full body", "pool", "intermediate", 9, "Low-impact full-body conditioning."],
  ["Burpee", "hiit", "full body", "bodyweight", "advanced", 10, "Chest to floor, explosive jump, repeat."],
  ["Kettlebell Swing", "hiit", "glutes", "kettlebell", "intermediate", 9.5, "Hip snap, not a squat. Float the bell to chest height."],
  ["Mountain Climber", "hiit", "core", "bodyweight", "beginner", 8, "Hips low, drive the knees fast."],
  ["Box Jump", "hiit", "legs", "plyo box", "intermediate", 8.5, "Land soft, step down between reps."],
  ["Yoga Flow", "mobility", "full body", "mat", "beginner", 3, "Vinyasa sequence to mobilise hips, spine and shoulders."],
  ["Foam Rolling", "mobility", "full body", "foam roller", "beginner", 2.5, "Slow passes on tight tissue, 30-60 seconds per area."],
  ["Hip Mobility Circuit", "mobility", "hips", "none", "beginner", 3, "90/90 switches, couch stretch and deep squat holds."],
  ["Incline Walk", "cardio", "legs", "treadmill", "beginner", 6, "12% incline at 5 km/h for a low-impact fat burn."],
] as const;

const WORKOUT_TEMPLATES = [
  { title: "Upper Body Strength", category: "strength", duration: 55, cal: 420, intensity: "high" },
  { title: "Lower Body Power", category: "strength", duration: 60, cal: 480, intensity: "high" },
  { title: "Push Day", category: "strength", duration: 50, cal: 390, intensity: "medium" },
  { title: "Pull Day", category: "strength", duration: 50, cal: 400, intensity: "medium" },
  { title: "5K Tempo Run", category: "cardio", duration: 28, cal: 340, intensity: "high", distance: 5 },
  { title: "Easy Zone 2 Run", category: "cardio", duration: 45, cal: 410, intensity: "low", distance: 7.5 },
  { title: "Interval Bike", category: "cardio", duration: 40, cal: 460, intensity: "high", distance: 18 },
  { title: "HIIT Circuit", category: "hiit", duration: 25, cal: 330, intensity: "high" },
  { title: "Kettlebell Complex", category: "hiit", duration: 30, cal: 360, intensity: "high" },
  { title: "Core & Mobility", category: "mobility", duration: 25, cal: 130, intensity: "low" },
  { title: "Yoga Recovery", category: "mobility", duration: 40, cal: 160, intensity: "low" },
  { title: "Pool Swim", category: "cardio", duration: 35, cal: 380, intensity: "medium", distance: 1.4 },
];

const MEAL_TEMPLATES = [
  { name: "Greek yogurt, berries & granola", mealType: "breakfast", calories: 420, protein: 32, carbs: 48, fat: 11 },
  { name: "Veggie omelette & sourdough", mealType: "breakfast", calories: 480, protein: 30, carbs: 36, fat: 24 },
  { name: "Overnight oats with banana", mealType: "breakfast", calories: 450, protein: 22, carbs: 66, fat: 12 },
  { name: "Protein smoothie", mealType: "breakfast", calories: 330, protein: 35, carbs: 38, fat: 6 },
  { name: "Grilled chicken quinoa bowl", mealType: "lunch", calories: 610, protein: 48, carbs: 62, fat: 18 },
  { name: "Salmon poke bowl", mealType: "lunch", calories: 640, protein: 42, carbs: 68, fat: 21 },
  { name: "Turkey avocado wrap", mealType: "lunch", calories: 560, protein: 38, carbs: 52, fat: 20 },
  { name: "Lentil & feta salad", mealType: "lunch", calories: 490, protein: 26, carbs: 54, fat: 17 },
  { name: "Steak, sweet potato & greens", mealType: "dinner", calories: 720, protein: 52, carbs: 58, fat: 26 },
  { name: "Tofu stir fry with rice", mealType: "dinner", calories: 640, protein: 34, carbs: 78, fat: 18 },
  { name: "Chicken fajita bowl", mealType: "dinner", calories: 680, protein: 50, carbs: 62, fat: 22 },
  { name: "Baked cod, potatoes, broccoli", mealType: "dinner", calories: 590, protein: 46, carbs: 55, fat: 15 },
  { name: "Whey shake", mealType: "snack", calories: 180, protein: 26, carbs: 8, fat: 3 },
  { name: "Apple & peanut butter", mealType: "snack", calories: 240, protein: 8, carbs: 28, fat: 12 },
  { name: "Cottage cheese & pineapple", mealType: "snack", calories: 210, protein: 24, carbs: 20, fat: 4 },
  { name: "Dark chocolate square", mealType: "snack", calories: 120, protein: 2, carbs: 12, fat: 8 },
];

async function ensureDemoUser(): Promise<number> {
  const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing) return existing.id;
  const [createdUser] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Alex Rivera",
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: "owner",
    })
    .returning();
  return createdUser.id;
}

async function runSeed(): Promise<void> {
  const userId = await ensureDemoUser();

  const existing = await db.select().from(profiles).limit(1);
  if (existing.length > 0) {
    if (existing[0].userId == null) {
      await db.update(profiles).set({ userId }).where(eq(profiles.id, existing[0].id));
    }
    return;
  }

  const [profile] = await db
    .insert(profiles)
    .values({
      userId,
      name: "Alex Rivera",
      age: 31,
      heightCm: 178,
      startWeightKg: 82.4,
      activityLevel: "moderate",
    })
    .returning();

  await db.insert(goals).values({
    profileId: profile.id,
    calorieTarget: 2400,
    burnTarget: 650,
    proteinTarget: 165,
    stepTarget: 10000,
    waterTargetMl: 3000,
    sleepTargetHours: 8,
    activeMinutesTarget: 45,
    workoutsPerWeek: 5,
    weightTargetKg: 76,
  });

  await db.insert(exercises).values(
    EXERCISE_LIBRARY.map((e) => ({
      name: e[0],
      category: e[1],
      muscleGroup: e[2],
      equipment: e[3],
      difficulty: e[4],
      metValue: e[5],
      description: e[6],
    })),
  );

  const random = rng(20260214);
  const today = todayISO();
  const days = 90;

  const logRows: (typeof dailyLogs.$inferInsert)[] = [];
  const workoutRows: (typeof workouts.$inferInsert)[] = [];
  const mealRows: (typeof meals.$inferInsert)[] = [];

  let weight = 82.4;

  for (let i = days - 1; i >= 0; i -= 1) {
    const iso = addDays(today, -i);
    const [yy, mm, dd] = iso.split("-").map(Number);
    const dayDate = new Date(yy, mm - 1, dd);
    const dow = dayDate.getDay();
    const isWeekend = dow === 0 || dow === 6;

    weight -= 0.055 + random() * 0.02;
    const noisyWeight = Math.round((weight + (random() - 0.5) * 0.6) * 10) / 10;

    const baseSteps = isWeekend ? 7200 : 9600;
    const steps = Math.round(baseSteps + random() * 5200 - 800);
    const sleep = Math.round((6.4 + random() * 2.3) * 10) / 10;

    logRows.push({
      profileId: profile.id,
      logDate: iso,
      steps,
      waterMl: i === 0 ? 1450 : Math.round((1800 + random() * 1500) / 50) * 50,
      sleepHours: sleep,
      restingHr: Math.round(60 - (days - i) * 0.03 + random() * 4),
      weightKg: noisyWeight,
      mood: sleep > 7.4 ? "great" : sleep > 6.6 ? "good" : "tired",
    });

    // ~5 workouts a week
    const trains = dow !== 0 && (dow !== 4 || random() > 0.5);
    if (trains) {
      const t = WORKOUT_TEMPLATES[Math.floor(random() * WORKOUT_TEMPLATES.length)];
      const hour = isWeekend ? 9 : random() > 0.5 ? 7 : 18;
      const performedAt = new Date(yy, mm - 1, dd, hour, Math.floor(random() * 50));
      workoutRows.push({
        profileId: profile.id,
        title: t.title,
        category: t.category,
        durationMin: t.duration + Math.round((random() - 0.5) * 10),
        calories: t.cal + Math.round((random() - 0.5) * 70),
        intensity: t.intensity,
        distanceKm: t.distance ?? null,
        notes: random() > 0.7 ? "Felt strong, added a little extra volume." : null,
        performedAt,
      });
    }

    // Detailed meals for the last 14 days
    if (i < 14) {
      const picks = ["breakfast", "lunch", "dinner", "snack"];
      for (const type of picks) {
        if (type === "snack" && random() > 0.75) continue;
        if (i === 0 && (type === "dinner" || type === "snack")) continue;
        const candidates = MEAL_TEMPLATES.filter((m) => m.mealType === type);
        const m = candidates[Math.floor(random() * candidates.length)];
        const hourByType: Record<string, number> = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 };
        mealRows.push({
          profileId: profile.id,
          name: m.name,
          mealType: m.mealType,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          consumedAt: new Date(yy, mm - 1, dd, hourByType[type], Math.floor(random() * 55)),
        });
      }
    }
  }

  await db.insert(dailyLogs).values(logRows);
  await db.insert(workouts).values(workoutRows);
  await db.insert(meals).values(mealRows);
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

type WorkoutInsertResult = {
  id: string;
  workout_on: string | null;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days: number) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - index);
    dates.push(formatDateKey(d));
  }
  return dates;
}

export async function seedAnalyticsDemoAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const range = String(formData.get("range") ?? "120");

  if (!supabase) {
    redirect(`/analytics?range=${range}`);
  }

  const dayKeys = buildDateRange(120);
  const fromDate = dayKeys[0];

  const [weightResult, calorieResult, workoutResult] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("logged_on")
      .eq("user_id", user.id)
      .gte("logged_on", fromDate),
    supabase
      .from("calorie_logs")
      .select("logged_on")
      .eq("user_id", user.id)
      .gte("logged_on", fromDate),
    supabase
      .from("workouts")
      .select("workout_on")
      .eq("user_id", user.id)
      .gte("workout_on", fromDate),
  ]);

  const existingWeightDays = new Set((weightResult.data ?? []).map((row) => String(row.logged_on ?? "")));
  const existingCalorieDays = new Set((calorieResult.data ?? []).map((row) => String(row.logged_on ?? "")));
  const existingWorkoutDays = new Set((workoutResult.data ?? []).map((row) => String(row.workout_on ?? "")));

  const userSeed = user.id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 11;
  const baseWeight = 68 + userSeed;

  const weightInserts: Array<{ user_id: string; logged_on: string; weight_kg: number }> = [];
  const calorieInserts: Array<{
    user_id: string;
    logged_on: string;
    meal_type: string;
    food_description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    note: string;
  }> = [];

  const muscles = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Glutes"];
  const categories = ["Upper Body", "Lower Body", "Core", "Full Body"];
  const workoutInserts: Array<{
    user_id: string;
    name: string;
    workout_on: string;
    workout_type: string;
    category: string;
    duration_minutes: number;
    calories_burned: number;
    notes: string;
  }> = [];
  const workoutDayToMuscle = new Map<string, string>();

  dayKeys.forEach((dateKey, index) => {
    if (!existingWeightDays.has(dateKey)) {
      const trend = (index / 120) * (userSeed % 2 === 0 ? -1.8 : 1.2);
      const wave = Math.sin((index + userSeed) / 7) * 0.5;
      const noise = Math.cos((index + userSeed) / 3) * 0.2;
      const weight = Number((baseWeight + trend + wave + noise).toFixed(1));
      weightInserts.push({
        user_id: user.id,
        logged_on: dateKey,
        weight_kg: Math.max(40, weight),
      });
    }

    if (!existingCalorieDays.has(dateKey)) {
      const calories = Math.round(1900 + (Math.sin(index / 6) + 1) * 260 + userSeed * 14);
      const protein = Math.round(125 + Math.sin(index / 5) * 18 + userSeed);
      const carbs = Math.round(200 + Math.cos(index / 8) * 35 + userSeed * 2);
      const fat = Math.round(60 + Math.sin(index / 9) * 12 + userSeed);
      calorieInserts.push({
        user_id: user.id,
        logged_on: dateKey,
        meal_type: "other",
        food_description: "Seeded daily nutrition total",
        calories,
        protein_g: Math.max(60, protein),
        carbs_g: Math.max(80, carbs),
        fat_g: Math.max(25, fat),
        note: "Auto-seeded for analytics graph.",
      });
    }

    if (index % 3 === 0 && !existingWorkoutDays.has(dateKey)) {
      const muscle = muscles[(index + userSeed) % muscles.length];
      const category = categories[(index + userSeed) % categories.length];
      workoutInserts.push({
        user_id: user.id,
        name: `${muscle} Session`,
        workout_on: dateKey,
        workout_type: "strength",
        category,
        duration_minutes: 40 + ((index + userSeed) % 25),
        calories_burned: 220 + ((index * 11 + userSeed) % 260),
        notes: "Auto-seeded workout for analytics.",
      });
      workoutDayToMuscle.set(dateKey, muscle);
    }
  });

  if (weightInserts.length > 0) {
    await supabase.from("weight_logs").insert(weightInserts);
  }

  if (calorieInserts.length > 0) {
    await supabase.from("calorie_logs").insert(calorieInserts);
  }

  if (workoutInserts.length > 0) {
    const { data: createdWorkouts } = await supabase
      .from("workouts")
      .insert(workoutInserts)
      .select("id, workout_on");

    const exerciseInserts = (createdWorkouts ?? []).map((workout, index) => {
      const record = workout as WorkoutInsertResult;
      const workoutOn = String(record.workout_on ?? "");
      const muscle = workoutDayToMuscle.get(workoutOn) ?? "Full Body";
      return {
        workout_id: record.id,
        user_id: user.id,
        exercise_name: `${muscle} Compound`,
        exercise_type: "weight_train",
        category: workoutInserts[index]?.category ?? "Full Body",
        muscle_group: muscle,
        sets: 3 + (index % 2),
        reps: 8 + (index % 5),
        weight_kg: 25 + ((index + userSeed) % 45),
      };
    });

    if (exerciseInserts.length > 0) {
      await supabase.from("exercise_logs").insert(exerciseInserts);
    }
  }

  revalidatePath("/analytics");
  revalidatePath("/weight-tracker");
  revalidatePath("/workouts");
  redirect(`/analytics?range=${range}&seeded=1`);
}

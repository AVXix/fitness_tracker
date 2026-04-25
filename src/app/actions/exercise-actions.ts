"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { parseOptionalNumber } from "./shared";

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function addExerciseLogAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const exerciseType = String(formData.get("exerciseType") ?? "").trim();
  const exerciseName = String(formData.get("exerciseName") ?? "").trim();
  const workoutDate = String(formData.get("workoutDate") ?? "").trim() || new Date().toISOString().split("T")[0];
  const category = parseOptionalText(formData.get("category"));

  if (!exerciseName || !exerciseType) {
    return;
  }

  const { data: workoutData } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_on", workoutDate)
    .limit(1)
    .maybeSingle();

  let workoutId = workoutData?.id;

  if (!workoutId) {
    const { data: newWorkout } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        name: `Workout - ${workoutDate}`,
        workout_on: workoutDate,
        workout_type: exerciseType === "cardio" ? "cardio" : "strength",
        category,
      })
      .select("id")
      .single();

    workoutId = newWorkout?.id;
  }

  if (!workoutId) {
    return;
  }

  const sets = parseOptionalNumber(formData.get("sets"));
  const reps = parseOptionalNumber(formData.get("reps"));
  const weight = parseOptionalNumber(formData.get("weight"));
  const duration = parseOptionalNumber(formData.get("duration"));
  const distance = parseOptionalNumber(formData.get("distance"));

  await supabase.from("exercise_logs").insert({
    workout_id: workoutId,
    user_id: user.id,
    exercise_name: exerciseName,
    exercise_type: exerciseType,
    category,
    muscle_group: parseOptionalText(formData.get("muscleGroup")),
    cardio_intensity: parseOptionalText(formData.get("cardioIntensity")),
    sets: sets,
    reps: reps,
    weight_kg: weight,
    duration_seconds: duration ? duration * 60 : null,
    distance_km: distance,
  });

  revalidatePath("/workouts");
}

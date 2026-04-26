"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { parseOptionalNumber } from "./shared";

export async function saveProfileAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const fitnessLevel = String(formData.get("fitnessLevel") ?? "").trim();
  const primaryGoal = String(formData.get("primaryGoal") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const isTrainer = formData.get("isTrainer") === "on";
  const trainerContact = String(formData.get("trainerContact") ?? "").trim();

  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName || null,
    age: parseOptionalNumber(formData.get("age")),
    height_cm: parseOptionalNumber(formData.get("heightCm")),
    gender: gender || null,
    fitness_level: fitnessLevel || null,
    primary_goal: primaryGoal || null,
    bio: bio || null,
    is_trainer: isTrainer,
    trainer_contact: isTrainer ? trainerContact || null : null,
  });

  revalidatePath("/profile");
  revalidatePath("/trainers");
}

export async function addWeightLogAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const weightKg = parseOptionalNumber(formData.get("weightKg"));
  if (weightKg === null) {
    return;
  }

  const loggedOn = String(formData.get("loggedOn") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("weight_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("logged_on", loggedOn)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("weight_logs")
      .update({ weight_kg: weightKg })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("weight_logs").insert({
      user_id: user.id,
      logged_on: loggedOn,
      weight_kg: weightKg,
    });
  }

  revalidatePath("/profile");
  revalidatePath("/weight-tracker");
}

export async function addWorkoutAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return;
  }

  const workoutOn = String(formData.get("workoutOn") ?? "").trim() || new Date().toISOString().slice(0, 10);

  await supabase
    .from("workouts")
    .upsert(
      {
        user_id: user.id,
        name,
        workout_on: workoutOn,
        workout_date: workoutOn,
        duration_minutes: parseOptionalNumber(formData.get("durationMinutes")),
        total_minutes: parseOptionalNumber(formData.get("durationMinutes")),
        calories_burned: parseOptionalNumber(formData.get("caloriesBurned")),
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
      { onConflict: "user_id,workout_on" }
    );

  revalidatePath("/profile");
}

export async function addCalorieLogAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const calories = parseOptionalNumber(formData.get("calories"));

  if (calories === null) {
    return;
  }

  const loggedOn = String(formData.get("loggedOn") ?? "").trim() || new Date().toISOString().slice(0, 10);

  const modernInsert = await supabase.from("calorie_logs").insert({
    user_id: user.id,
    logged_on: loggedOn,
    meal_type: String(formData.get("mealType") ?? "other").trim(),
    food_description: String(formData.get("foodDescription") ?? "Daily intake").trim(),
    calories,
    protein_g: parseOptionalNumber(formData.get("proteinG")),
    carbs_g: parseOptionalNumber(formData.get("carbsG")),
    fat_g: parseOptionalNumber(formData.get("fatG")),
    note: String(formData.get("note") ?? "").trim() || null,
  });

  if (modernInsert.error) {
    const legacyInsert = await supabase.from("calorie_logs").insert({
      user_id: user.id,
      log_date: loggedOn,
      consumed_kcal: calories,
      burned_kcal: 0,
    });

    if (legacyInsert.error) {
      return;
    }
  }

  revalidatePath("/weight-tracker");
}

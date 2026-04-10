"use server";

import { revalidatePath } from "next/cache";
import { requireUser, createSupabaseServerClient } from "@/lib/supabase/server";

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();

  if (!stringValue) {
    return null;
  }

  const numberValue = Number(stringValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}

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

  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName || null,
    age: parseOptionalNumber(formData.get("age")),
    height_cm: parseOptionalNumber(formData.get("heightCm")),
    gender: gender || null,
    fitness_level: fitnessLevel || null,
    primary_goal: primaryGoal || null,
    bio: bio || null,
  });

  revalidatePath("/profile");
}

export async function addGoalAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return;
  }

  await supabase.from("goals").insert({
    user_id: user.id,
    title,
    category: String(formData.get("category") ?? "").trim() || "general",
    goal_type: String(formData.get("goalType") ?? "").trim() || String(formData.get("category") ?? "").trim() || "general",
    target_value: parseOptionalNumber(formData.get("targetValue")),
    current_value: parseOptionalNumber(formData.get("currentValue")),
    target_unit: String(formData.get("targetUnit") ?? "").trim() || null,
    target_date: String(formData.get("targetDate") ?? "").trim() || null,
    end_date: String(formData.get("targetDate") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/profile");
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

  await supabase.from("weight_logs").insert({
    user_id: user.id,
    logged_on: String(formData.get("loggedOn") ?? "").trim() || new Date().toISOString().slice(0, 10),
    log_date: String(formData.get("loggedOn") ?? "").trim() || new Date().toISOString().slice(0, 10),
    weight_kg: weightKg,
    note: String(formData.get("note") ?? "").trim() || null,
  });

  revalidatePath("/profile");
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

  await supabase.from("workouts").insert({
    user_id: user.id,
    name,
    workout_on: String(formData.get("workoutOn") ?? "").trim() || new Date().toISOString().slice(0, 10),
    workout_date: String(formData.get("workoutOn") ?? "").trim() || new Date().toISOString().slice(0, 10),
    duration_minutes: parseOptionalNumber(formData.get("durationMinutes")),
    total_minutes: parseOptionalNumber(formData.get("durationMinutes")),
    calories_burned: parseOptionalNumber(formData.get("caloriesBurned")),
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/profile");
}

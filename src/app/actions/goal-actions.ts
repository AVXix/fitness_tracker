"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { parseOptionalNumber } from "./shared";

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

  const enableProgressTracking = String(formData.get("enableProgressTracking") ?? "").trim() === "on";
  const targetValue = enableProgressTracking ? parseOptionalNumber(formData.get("targetValue")) : null;
  const currentValueRaw = parseOptionalNumber(formData.get("currentValue"));
  const currentValue = enableProgressTracking ? (currentValueRaw ?? 0) : null;
  const targetUnit = enableProgressTracking
    ? String(formData.get("targetUnit") ?? "").trim() || null
    : null;

  await supabase.from("goals").insert({
    user_id: user.id,
    title,
    category: String(formData.get("category") ?? "fitness").trim(),
    target_date: String(formData.get("targetDate") ?? "").trim() || null,
    target_value: targetValue,
    current_value: currentValue,
    target_unit: targetUnit,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  revalidatePath("/goals");
}

export async function getGoalAIAdviceAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const goalId = String(formData.get("goalId") ?? "").trim();
  const goalTitle = String(formData.get("goalTitle") ?? "").trim();

  if (!goalId || !goalTitle) {
    return null;
  }

  const advice = generateAIAdvice(goalTitle);

  await supabase
    .from("goals")
    .update({ ai_advice: advice })
    .eq("id", goalId)
    .eq("user_id", user.id);

  revalidatePath("/goals");
  return advice;
}

export async function completeGoalAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const goalId = String(formData.get("goalId") ?? "").trim();

  if (!goalId) {
    return false;
  }

  const primaryUpdate = await supabase
    .from("goals")
    .update({ is_completed: true, status: "completed" })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (primaryUpdate.error) {
    const fallbackUpdate = await supabase
      .from("goals")
      .update({ status: "completed" })
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (fallbackUpdate.error) {
      return false;
    }
  }

  revalidatePath("/goals");
  return true;
}

export async function toggleGoalCompletionAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return false;
  }

  const goalId = String(formData.get("goalId") ?? "").trim();
  const completedValue = String(formData.get("completed") ?? "false").trim();
  const completed = completedValue === "true";
  const status = completed ? "completed" : "active";

  if (!goalId) {
    return false;
  }

  const primaryUpdate = await supabase
    .from("goals")
    .update({ is_completed: completed, status })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (primaryUpdate.error) {
    const fallbackUpdate = await supabase
      .from("goals")
      .update({ status })
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (fallbackUpdate.error) {
      return false;
    }
  }

  revalidatePath("/goals");
  return true;
}

export async function addGoalProgressAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      currentValue: null as number | null,
      completed: false,
      error: "Supabase client is not available.",
    };
  }

  const goalId = String(formData.get("goalId") ?? "").trim();
  const progressDelta = parseOptionalNumber(formData.get("progressDelta"));

  if (!goalId || progressDelta === null || progressDelta <= 0) {
    return {
      ok: false,
      currentValue: null as number | null,
      completed: false,
      error: "Enter a valid progress amount.",
    };
  }

  const goalLookup = await supabase
    .from("goals")
    .select("current_value, target_value")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (goalLookup.error || !goalLookup.data) {
    return {
      ok: false,
      currentValue: null as number | null,
      completed: false,
      error: goalLookup.error?.message || "Could not load goal progress fields.",
    };
  }

  const currentValue = Number(goalLookup.data.current_value ?? 0);
  const targetValue = Number(goalLookup.data.target_value ?? 0);
  const nextCurrentValue = currentValue + progressDelta;
  const shouldComplete = targetValue > 0 && nextCurrentValue >= targetValue;
  const nextStatus = shouldComplete ? "completed" : "active";

  const primaryUpdate = await supabase
    .from("goals")
    .update({
      current_value: nextCurrentValue,
      status: nextStatus,
      is_completed: shouldComplete,
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (primaryUpdate.error) {
    const fallbackUpdate = await supabase
      .from("goals")
      .update({
        current_value: nextCurrentValue,
        status: nextStatus,
      })
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (fallbackUpdate.error) {
      return {
        ok: false,
        currentValue: null as number | null,
        completed: false,
        error: fallbackUpdate.error.message || primaryUpdate.error.message,
      };
    }
  }

  revalidatePath("/goals");
  return {
    ok: true,
    currentValue: nextCurrentValue,
    completed: shouldComplete,
    error: null as string | null,
  };
}

export async function updateGoalAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const goalId = String(formData.get("goalId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const targetValue = parseOptionalNumber(formData.get("targetValue"));
  const currentValue = parseOptionalNumber(formData.get("currentValue"));
  const targetUnit = String(formData.get("targetUnit") ?? "").trim() || null;

  if (!goalId || !title || !["active", "paused", "completed"].includes(status)) {
    return;
  }

  const autoCompleted =
    targetValue !== null &&
    currentValue !== null &&
    targetValue > 0 &&
    currentValue >= targetValue;

  const nextStatus = autoCompleted ? "completed" : status;
  const isCompleted = nextStatus === "completed";

  const primaryUpdate = await supabase
    .from("goals")
    .update({
      title,
      target_date: String(formData.get("targetDate") ?? "").trim() || null,
      target_value: targetValue,
      current_value: currentValue,
      target_unit: targetUnit,
      status: nextStatus,
      is_completed: isCompleted,
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (primaryUpdate.error) {
    await supabase
      .from("goals")
      .update({
        title,
        target_date: String(formData.get("targetDate") ?? "").trim() || null,
        target_value: targetValue,
        current_value: currentValue,
        target_unit: targetUnit,
        status: nextStatus,
      })
      .eq("id", goalId)
      .eq("user_id", user.id);
  }

  revalidatePath("/goals");
}

export async function deleteGoalAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const goalId = String(formData.get("goalId") ?? "").trim();

  if (!goalId) {
    return;
  }

  await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  revalidatePath("/goals");
}

function generateAIAdvice(goalTitle: string): string {
  const adviceTemplates = {
    lose: [
      "Focus on creating a calorie deficit through a combination of diet and exercise. Aim for 500-750 cal deficit per day for steady weight loss of 0.5-1.5 lbs per week.",
      "Prioritize protein intake (0.8-1g per lb of bodyweight) to preserve muscle while losing fat. Include strength training 3-4x/week.",
      "Track your food intake consistently. Apps like MyFitnessPal can help you understand eating patterns and identify areas to improve.",
      "Increase daily movement: Take stairs, park farther away, do 10min walks after meals. NEAT (non-exercise activity thermogenesis) contributes significantly to calorie burn.",
    ],
    gain: [
      "Consume 300-500 more calories than your maintenance level. Focus on whole foods: chicken, fish, eggs, rice, oats, and nuts.",
      "Lift heavy weights 4-5x per week with progressive overload. Aim for 6-12 reps per set for muscle growth.",
      "Get 0.8-1.2g of protein per lb of bodyweight daily to support muscle protein synthesis.",
      "Track your workout performance and gradually increase weight, reps, or sets each week to drive continuous progress.",
    ],
    strength: [
      "Follow a structured program like Starting Strength, StrongLifts 5x5, or 5/3/1. These are proven for building strength.",
      "Focus on compound lifts: Squats, Deadlifts, Bench Press, and Rows. These engage multiple muscle groups.",
      "Rest 48 hours between training the same muscle groups. Prioritize sleep (7-9 hours) for recovery.",
      "Progressive overload is key: Gradually increase weight each week. Even 2.5 lbs increases matter.",
    ],
    endurance: [
      "Build aerobic capacity with moderate intensity cardio 3-4x/week (running, cycling, swimming). Aim for 30-60 minutes per session.",
      "Include 1 high-intensity interval training (HIIT) session weekly to improve VO2 max.",
      "Gradually increase weekly mileage/duration by 10% to prevent injury. Listen to your body.",
      "Cross-train with different cardio activities to reduce injury risk and engage different muscle groups.",
    ],
    health: [
      "Start with small, sustainable habits: 10,000 steps daily, 8 glasses of water, and 30 minutes of movement.",
      "Sleep is foundational. Aim for consistent 7-9 hours per night at the same time daily.",
      "Reduce processed foods and sugar. Focus on whole foods, vegetables, lean proteins, and healthy fats.",
      "Schedule regular health checkups. Know your baseline numbers: blood pressure, cholesterol, glucose levels.",
    ],
    flexibility: [
      "Practice yoga or static stretching 3-4x/week for 10-30 minutes. Target tight areas like hamstrings, hip flexors, and shoulders.",
      "Use foam rolling daily for myofascial release. 90 seconds per muscle group minimum.",
      "Incorporate dynamic stretching before workouts and static stretching after. Consistency is key.",
      "Combine stretching with strength training for balanced mobility and strength.",
    ],
  };

  const lowerGoal = goalTitle.toLowerCase();
  let selectedAdvice = adviceTemplates.health;

  if (lowerGoal.includes("lose") || lowerGoal.includes("weight loss")) {
    selectedAdvice = adviceTemplates.lose;
  } else if (lowerGoal.includes("gain") || lowerGoal.includes("build") || lowerGoal.includes("muscle")) {
    selectedAdvice = adviceTemplates.gain;
  } else if (lowerGoal.includes("strength") || lowerGoal.includes("strong")) {
    selectedAdvice = adviceTemplates.strength;
  } else if (lowerGoal.includes("endurance") || lowerGoal.includes("run") || lowerGoal.includes("cardio")) {
    selectedAdvice = adviceTemplates.endurance;
  } else if (lowerGoal.includes("flexibility") || lowerGoal.includes("stretch")) {
    selectedAdvice = adviceTemplates.flexibility;
  }

  const tips = selectedAdvice.sort(() => Math.random() - 0.5).slice(0, 2);
  return tips.join("\n\n");
}

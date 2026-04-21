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

  // Update existing entry for same day if present; otherwise insert a new one.
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

// Goals and AI Advice actions
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

  // Simulate AI advice generation (in production, call actual AI service)
  const advice = generateAIAdvice(goalTitle);

  // Save advice to goal
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
    // Backward-compat fallback for schemas that do not yet include `is_completed`.
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
    // Backward-compat fallback for schemas that do not yet include `is_completed`.
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
    // Backward-compat fallback for schemas that do not yet include `is_completed`.
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
  // Logical imagination-based AI advice for fitness goals
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

  // Extract key word from goal title to match advice template
  const lowerGoal = goalTitle.toLowerCase();
  let selectedAdvice = adviceTemplates.health; // default

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

  // Pick 2 random tips from selected category
  const tips = selectedAdvice.sort(() => Math.random() - 0.5).slice(0, 2);
  return tips.join("\n\n");
}

// Forum actions
export async function createForumPostAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    return;
  }

  await supabase.from("forum_posts").insert({
    user_id: user.id,
    title,
    content,
  });

  revalidatePath("/forum");
}

export async function createForumCommentAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!postId || !content) {
    return;
  }

  // Insert comment and increment comment count
  await supabase.from("forum_comments").insert({
    post_id: postId,
    user_id: user.id,
    content,
  });

  await supabase.rpc("increment_comment_count", { post_id: postId });

  revalidatePath("/forum");
}

export async function voteForumPostAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const voteType = String(formData.get("voteType") ?? "").trim() as "upvote" | "downvote";

  if (!postId || !["upvote", "downvote"].includes(voteType)) {
    return;
  }

  // Check if user already voted
  const { data: existingVote } = await supabase
    .from("forum_votes")
    .select("*")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existingVote) {
    // Remove vote if same type, otherwise switch vote
    if (existingVote.vote_type === voteType) {
      await supabase.from("forum_votes").delete().eq("id", existingVote.id);
      // Update post counts
      const increment = voteType === "upvote" ? -1 : 1;
      await supabase.rpc("update_post_votes", {
        post_id: postId,
        upvote_delta: voteType === "upvote" ? increment : 0,
        downvote_delta: voteType === "downvote" ? increment : 0,
      });
    } else {
      // Update vote type
      await supabase
        .from("forum_votes")
        .update({ vote_type: voteType })
        .eq("id", existingVote.id);
      // Update post counts (switch vote)
      const upvoteDelta = voteType === "upvote" ? 1 : -1;
      const downvoteDelta = voteType === "downvote" ? 1 : -1;
      await supabase.rpc("update_post_votes", {
        post_id: postId,
        upvote_delta: upvoteDelta,
        downvote_delta: downvoteDelta,
      });
    }
  } else {
    // Add new vote
    await supabase.from("forum_votes").insert({
      user_id: user.id,
      post_id: postId,
      vote_type: voteType,
    });
    // Update post counts
    const upvoteDelta = voteType === "upvote" ? 1 : 0;
    const downvoteDelta = voteType === "downvote" ? 1 : 0;
    await supabase.rpc("update_post_votes", {
      post_id: postId,
      upvote_delta: upvoteDelta,
      downvote_delta: downvoteDelta,
    });
  }

  revalidatePath("/forum");
}

// Exercise logging actions
export async function addExerciseLogAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const exerciseType = String(formData.get("exerciseType") ?? "").trim();
  const exerciseName = String(formData.get("exerciseName") ?? "").trim();
  const workoutDate = String(formData.get("workoutDate") ?? "").trim() || new Date().toISOString().split("T")[0];

  if (!exerciseName || !exerciseType) {
    return;
  }

  // Create or get workout for today
  const { data: workoutData } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", user.id)
    .eq("workout_on", workoutDate)
    .single();

  let workoutId = workoutData?.id;

  if (!workoutId) {
    const { data: newWorkout } = await supabase
      .from("workouts")
      .insert({
        user_id: user.id,
        name: `Workout - ${workoutDate}`,
        workout_on: workoutDate,
        workout_type: exerciseType === "cardio" ? "cardio" : "strength",
        category: String(formData.get("category") ?? null),
      })
      .select("id")
      .single();

    workoutId = newWorkout?.id;
  }

  if (!workoutId) {
    return;
  }

  // Log the exercise
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
    category: String(formData.get("category") ?? null),
    muscle_group: String(formData.get("muscleGroup") ?? null),
    cardio_intensity: String(formData.get("cardioIntensity") ?? null),
    sets: sets,
    reps: reps,
    weight_kg: weight,
    duration_seconds: duration ? duration * 60 : null,
    distance_km: distance,
  });

  revalidatePath("/workouts");
}

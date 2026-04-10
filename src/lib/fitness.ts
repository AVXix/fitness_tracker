import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRecord = {
  id: string;
  display_name: string | null;
  age: number | null;
  height_cm: number | null;
  gender: string | null;
  fitness_level: string | null;
  primary_goal: string | null;
  bio: string | null;
};

type GoalRecord = {
  id: string;
  title: string;
  category: string;
  goal_type: string | null;
  status: string;
  target_value: number | null;
  current_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  end_date: string | null;
};

type WeightLogRecord = {
  id: string;
  logged_on: string | null;
  log_date: string | null;
  weight_kg: number;
  note: string | null;
};

type WorkoutRecord = {
  id: string;
  name: string;
  workout_on: string | null;
  workout_date: string | null;
  duration_minutes: number | null;
  total_minutes: number | null;
  calories_burned: number | null;
};

export type FitnessDashboardData = {
  profile: ProfileRecord | null;
  goals: GoalRecord[];
  weightLogs: WeightLogRecord[];
  workouts: WorkoutRecord[];
  setupRequired: boolean;
  errorMessage: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Could not load your fitness data yet.";
}

export const getFitnessDashboardData = cache(async (userId: string): Promise<FitnessDashboardData> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      profile: null,
      goals: [],
      weightLogs: [],
      workouts: [],
      setupRequired: true,
      errorMessage: "Supabase environment variables are missing.",
    };
  }

  try {
    const [profileResult, goalsResult, weightLogsResult, workoutsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRecord>(),
      supabase
        .from("goals")
        .select("id, title, category, goal_type, status, target_value, current_value, target_unit, target_date, end_date")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<GoalRecord[]>(),
      supabase
        .from("weight_logs")
        .select("id, logged_on, log_date, weight_kg, note")
        .order("logged_on", { ascending: false })
        .limit(5)
        .returns<WeightLogRecord[]>(),
      supabase
        .from("workouts")
        .select("id, name, workout_on, workout_date, duration_minutes, total_minutes, calories_burned")
        .order("workout_on", { ascending: false })
        .limit(5)
        .returns<WorkoutRecord[]>(),
    ]);

    const errors = [
      profileResult.error,
      goalsResult.error,
      weightLogsResult.error,
      workoutsResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return {
        profile: null,
        goals: [],
        weightLogs: [],
        workouts: [],
        setupRequired: true,
        errorMessage: getErrorMessage(errors[0]),
      };
    }

    return {
      profile: profileResult.data,
      goals: goalsResult.data ?? [],
      weightLogs: weightLogsResult.data ?? [],
      workouts: workoutsResult.data ?? [],
      setupRequired: false,
      errorMessage: null,
    };
  } catch (error) {
    return {
      profile: null,
      goals: [],
      weightLogs: [],
      workouts: [],
      setupRequired: true,
      errorMessage: getErrorMessage(error),
    };
  }
});

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileRecord = {
  id: string;
  display_name: string | null;
  is_trainer: boolean | null;
  trainer_contact: string | null;
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

type CalorieLogRecord = {
  id: string;
  logged_on: string;
  meal_type: string;
  food_description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  note: string | null;
};

export type FitnessDashboardData = {
  profile: ProfileRecord | null;
  goals: GoalRecord[];
  weightLogs: WeightLogRecord[];
  workouts: WorkoutRecord[];
  calorieLogs: CalorieLogRecord[];
  setupRequired: boolean;
  errorMessage: string | null;
};

type GenericRow = Record<string, unknown>;

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Could not load your fitness data yet.";
}

export async function getFitnessDashboardData(userId: string): Promise<FitnessDashboardData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      profile: null,
      goals: [],
      weightLogs: [],
      workouts: [],
      calorieLogs: [],
      setupRequired: true,
      errorMessage: "Supabase environment variables are missing.",
    };
  }

  try {
    const [profileResult, goalsResult, workoutsResult, weightLogsResult, calorieLogsResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRecord>(),
      supabase
        .from("goals")
        .select("id, title, category, goal_type, status, target_value, current_value, target_unit, target_date, end_date")
        .order("created_at", { ascending: false })
        .limit(5)
        .returns<GoalRecord[]>(),
      supabase
        .from("workouts")
        .select("id, name, workout_on, workout_date, duration_minutes, total_minutes, calories_burned")
        .order("workout_on", { ascending: false })
        .limit(5)
        .returns<WorkoutRecord[]>(),
      (async () => {
        const byLoggedOn = await supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_on", { ascending: false })
          .limit(180);

        if (!byLoggedOn.error) {
          return byLoggedOn;
        }

        return supabase
          .from("weight_logs")
          .select("*")
          .eq("user_id", userId)
          .order("log_date", { ascending: false })
          .limit(180);
      })(),
      (async () => {
        const modern = await supabase
          .from("calorie_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_on", { ascending: false })
          .limit(180);

        if (!modern.error) {
          return modern;
        }

        return supabase
          .from("calorie_logs")
          .select("*")
          .eq("user_id", userId)
          .order("log_date", { ascending: false })
          .limit(180);
      })(),
    ]);

    const errors = [
      profileResult.error,
      goalsResult.error,
      weightLogsResult.error,
      workoutsResult.error,
      calorieLogsResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      return {
        profile: null,
        goals: [],
        weightLogs: [],
        workouts: [],
        calorieLogs: [],
        setupRequired: true,
        errorMessage: getErrorMessage(errors[0]),
      };
    }

    const weightLogs: WeightLogRecord[] = (weightLogsResult.data ?? [])
      .map((row) => {
        const r = row as GenericRow;

        const rawWeight = r.weight_kg;
        const weightKg = typeof rawWeight === "number" ? rawWeight : Number(rawWeight);
        if (!Number.isFinite(weightKg)) {
          return null;
        }

        return {
          id: String(r.id ?? ""),
          logged_on: (typeof r.logged_on === "string" ? r.logged_on : null) ?? null,
          log_date: (typeof r.log_date === "string" ? r.log_date : null) ?? null,
          weight_kg: weightKg,
          note: typeof r.note === "string" ? r.note : null,
        };
      })
      .filter((entry): entry is WeightLogRecord => Boolean(entry))
      .sort((a, b) => {
        const aDate = new Date(a.logged_on || a.log_date || 0).getTime();
        const bDate = new Date(b.logged_on || b.log_date || 0).getTime();
        return bDate - aDate;
      });

    const calorieLogs: CalorieLogRecord[] = (calorieLogsResult.data ?? [])
      .map((row) => {
        const r = row as GenericRow;

        const loggedOn =
          (typeof r.logged_on === "string" ? r.logged_on : null) ??
          (typeof r.log_date === "string" ? r.log_date : null);

        const rawCalories =
          r.calories ??
          r.consumed_kcal ??
          null;

        const calories = typeof rawCalories === "number" ? rawCalories : Number(rawCalories);

        if (!loggedOn || !Number.isFinite(calories)) {
          return null;
        }

        return {
          id: String(r.id ?? ""),
          logged_on: loggedOn,
          meal_type: typeof r.meal_type === "string" ? r.meal_type : "other",
          food_description: typeof r.food_description === "string" ? r.food_description : "Daily intake",
          calories,
          protein_g: r.protein_g === null || typeof r.protein_g === "number" ? (r.protein_g as number | null) : Number(r.protein_g),
          carbs_g: r.carbs_g === null || typeof r.carbs_g === "number" ? (r.carbs_g as number | null) : Number(r.carbs_g),
          fat_g: r.fat_g === null || typeof r.fat_g === "number" ? (r.fat_g as number | null) : Number(r.fat_g),
          note: typeof r.note === "string" ? r.note : null,
        };
      })
      .filter((entry): entry is CalorieLogRecord => Boolean(entry))
      .sort((a, b) => new Date(b.logged_on).getTime() - new Date(a.logged_on).getTime());

    return {
      profile: profileResult.data,
      goals: goalsResult.data ?? [],
      weightLogs,
      workouts: workoutsResult.data ?? [],
      calorieLogs,
      setupRequired: false,
      errorMessage: null,
    };
  } catch (error) {
    return {
      profile: null,
      goals: [],
      weightLogs: [],
      workouts: [],
      calorieLogs: [],
      setupRequired: true,
      errorMessage: getErrorMessage(error),
    };
  }
}

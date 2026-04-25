import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/ExerciseForm";
import { ExerciseHistory } from "@/components/ExerciseHistory";

interface ExerciseLog {
  id: string;
  exercise_name: string;
  exercise_type: string;
  category: string | null;
  muscle_group: string | null;
  cardio_intensity: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_km: number | null;
  created_at: string;
}

interface WorkoutWithExercises {
  id: string;
  name: string;
  workout_on: string | null;
  workout_date: string | null;
  workout_type: string | null;
  category: string | null;
  exercises: ExerciseLog[];
}

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  let workouts: WorkoutWithExercises[] = [];

  if (supabase && user) {
    const primaryResult = await supabase
      .from("workouts")
      .select(
        "id, name, workout_on, workout_date, workout_type, category, exercise_logs(id, exercise_name, exercise_type, category, muscle_group, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at)"
      )
      .eq("user_id", user.id)
      .order("workout_on", { ascending: false })
      .limit(20);

    const fallbackResult =
      primaryResult.error && primaryResult.error.message.toLowerCase().includes("workout_on")
        ? await supabase
            .from("workouts")
            .select(
              "id, name, workout_date, workout_type, category, exercise_logs(id, exercise_name, exercise_type, category, muscle_group, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at)"
            )
            .eq("user_id", user.id)
            .order("workout_date", { ascending: false })
            .limit(20)
        : null;

    const data = primaryResult.data ?? fallbackResult?.data ?? [];

    workouts = data.map((row) => {
      const item = row as {
        id: string;
        name: string;
        workout_on: string | null;
        workout_date: string | null;
        workout_type: string | null;
        category: string | null;
        exercise_logs: ExerciseLog[] | null;
      };

      const exercises = [...(item.exercise_logs ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        id: item.id,
        name: item.name,
        workout_on: item.workout_on,
        workout_date: item.workout_date,
        workout_type: item.workout_type,
        category: item.category,
        exercises,
      };
    });

    if (workouts.length === 0) {
      const { data: exerciseRows } = await supabase
        .from("exercise_logs")
        .select(
          "id, exercise_name, exercise_type, category, muscle_group, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at, workout_id"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(80);

      const groupedByDay = new Map<string, WorkoutWithExercises>();
      for (const row of exerciseRows ?? []) {
        const exercise = row as ExerciseLog & { workout_id?: string | null };
        const dayKey = (exercise.created_at || "").slice(0, 10);
        if (!dayKey) {
          continue;
        }

        const existing = groupedByDay.get(dayKey);
        if (existing) {
          existing.exercises.push(exercise);
          continue;
        }

        groupedByDay.set(dayKey, {
          id: String(exercise.workout_id ?? `legacy-${dayKey}`),
          name: `Workout - ${dayKey}`,
          workout_on: dayKey,
          workout_date: dayKey,
          workout_type: null,
          category: null,
          exercises: [exercise],
        });
      }

      workouts = Array.from(groupedByDay.values())
        .map((workout) => ({
          ...workout,
          exercises: workout.exercises.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
        }))
        .sort((a, b) => new Date(b.workout_on ?? b.workout_date ?? 0).getTime() - new Date(a.workout_on ?? a.workout_date ?? 0).getTime())
        .slice(0, 20);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workouts</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Log your weight training and cardio workouts
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Exercise Form */}
        <div>
          <ExerciseForm />
        </div>

        {/* Exercise History */}
        <div>
          <ExerciseHistory workouts={workouts} />
        </div>
      </div>
    </div>
  );
}

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

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  let exercises: ExerciseLog[] = [];

  if (supabase && user) {
    const { data } = await supabase
      .from("exercise_logs")
      .select(
        "id, exercise_name, exercise_type, category, muscle_group, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    exercises = data || [];
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
          <ExerciseHistory exercises={exercises} />
        </div>
      </div>
    </div>
  );
}

"use client";

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

export function ExerciseHistory({ exercises }: { exercises: ExerciseLog[] }) {
  // Group exercises by date
  const exercisesByDate = exercises.reduce(
    (acc, exercise) => {
      const date = new Date(exercise.created_at).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(exercise);
      return acc;
    },
    {} as Record<string, ExerciseLog[]>
  );

  // Create daily summaries
  const dailySummaries = Object.entries(exercisesByDate)
    .map(([date, dayExercises]) => {
      const weightExercises = dayExercises.filter((e) => e.exercise_type === "weight_train");
      const cardioExercises = dayExercises.filter((e) => e.exercise_type === "cardio");

      const totalWeightExercises = weightExercises.length;
      const totalCardioExercises = cardioExercises.length;
      const totalDuration = cardioExercises.reduce(
        (sum, e) => sum + (e.duration_seconds || 0),
        0
      );
      const totalDistance = cardioExercises.reduce(
        (sum, e) => sum + (e.distance_km || 0),
        0
      );

      return {
        date,
        dayExercises,
        totalWeightExercises,
        totalCardioExercises,
        totalDuration,
        totalDistance,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (exercises.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-600">No exercises logged yet</p>
        <p className="text-sm text-zinc-400 mt-1">
          Start by logging your first workout above!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Summary Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Workout History</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Weight Train</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Cardio</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Duration</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Distance</th>
              </tr>
            </thead>
            <tbody>
              {dailySummaries.map((day) => (
                <tr
                  key={day.date}
                  className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-blue-600 font-semibold">
                      {day.totalWeightExercises > 0 ? (
                        <>
                          💪 {day.totalWeightExercises}{" "}
                          {day.totalWeightExercises === 1
                            ? "exercise"
                            : "exercises"}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-green-600 font-semibold">
                      {day.totalCardioExercises > 0 ? (
                        <>
                          🏃 {day.totalCardioExercises}{" "}
                          {day.totalCardioExercises === 1
                            ? "session"
                            : "sessions"}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {day.totalDuration > 0 ? (
                      <span className="font-medium text-zinc-900">
                        {Math.round(day.totalDuration / 60)} min
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {day.totalDistance > 0 ? (
                      <span className="font-medium text-zinc-900">
                        {day.totalDistance.toFixed(1)} km
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Exercises */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200">
          <h3 className="font-semibold text-zinc-950">Recent Exercises</h3>
        </div>

        <div className="divide-y divide-zinc-200">
          {exercises.slice(0, 15).map((exercise) => (
            <div
              key={exercise.id}
              className="px-6 py-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-950">
                      {exercise.exercise_name}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        exercise.exercise_type === "cardio"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {exercise.exercise_type === "cardio"
                        ? "🏃 Cardio"
                        : "💪 Weight"}
                    </span>
                    {exercise.category && (
                      <span className="text-xs text-zinc-600 bg-gray-100 px-2 py-1 rounded">
                        {exercise.category}
                      </span>
                    )}
                    {exercise.muscle_group && (
                      <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        🦵 {exercise.muscle_group}
                      </span>
                    )}
                    {exercise.cardio_intensity && (
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          exercise.cardio_intensity === "Low"
                            ? "bg-blue-100 text-blue-700"
                            : exercise.cardio_intensity === "Moderate"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {exercise.cardio_intensity}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    {exercise.exercise_type === "cardio" ? (
                      <>
                        {exercise.duration_seconds && (
                          <div className="text-zinc-600">
                            ⏱️ {Math.round(exercise.duration_seconds / 60)} min
                          </div>
                        )}
                        {exercise.distance_km && (
                          <div className="text-zinc-600">
                            📍 {exercise.distance_km} km
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {exercise.sets && exercise.reps && (
                          <div className="text-zinc-600">
                            📊 {exercise.sets} × {exercise.reps}
                          </div>
                        )}
                        {exercise.weight_kg && (
                          <div className="text-zinc-600">
                            ⚖️ {exercise.weight_kg} kg
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="text-xs text-zinc-400 ml-4 text-right whitespace-nowrap">
                  {new Date(exercise.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

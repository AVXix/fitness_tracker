import type { FitnessDashboardData } from "@/lib/fitness";

interface DashboardProps {
  data: FitnessDashboardData;
}

export function Dashboard({ data }: DashboardProps) {
  const currentWeight = data.weightLogs[0]?.weight_kg;
  const workoutCount = data.workouts.length;
  const recentActivity = [
    ...data.workouts.map((w) => ({
      type: "workout",
      title: w.name,
      date: new Date(w.workout_on || w.workout_date || ""),
      details: w.duration_minutes ? `${w.duration_minutes} min` : undefined,
    })),
    ...data.weightLogs.map((wl) => ({
      type: "weight",
      title: `Weight logged: ${wl.weight_kg} kg`,
      date: new Date(wl.logged_on || wl.log_date || ""),
      details: wl.note,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Workouts</p>
          <p className="mt-2 text-4xl font-bold text-zinc-950">{workoutCount}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Recent Updates</p>
          <p className="mt-2 text-4xl font-bold text-zinc-950">{data.goals.length}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Current Weight</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {currentWeight ? `${currentWeight.toFixed(1)} kg` : "—"}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      activity.type === "workout" ? "bg-blue-500" : "bg-green-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{activity.title}</p>
                    {activity.details && (
                      <p className="text-xs text-zinc-500">{activity.details}</p>
                    )}
                  </div>
                </div>
                <time className="text-xs text-zinc-500">
                  {activity.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No activities yet. Start by logging a workout or weight!</p>
          )}
        </div>
      </div>
    </div>
  );
}

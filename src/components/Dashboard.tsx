import type { FitnessDashboardData } from "@/lib/fitness";
import Link from "next/link";

interface DashboardProps {
  data: FitnessDashboardData;
}

export function Dashboard({ data }: DashboardProps) {
  const workoutCount = data.workouts.length;
  const activeGoalsCount = data.goals.filter((goal) => goal.status.toLowerCase() !== "completed").length;
  const completedGoalsCount = data.goals.filter((goal) => goal.status.toLowerCase() === "completed").length;
  const latestWorkout = data.workouts[0] ?? null;

  function getWindowStart(days: number) {
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  function getAverageFromEntries(entries: number[]) {
    if (!entries.length) {
      return null;
    }

    const sum = entries.reduce((total, value) => total + value, 0);
    return sum / entries.length;
  }

  const sevenDaysAgo = getWindowStart(7);
  const thirtyDaysAgo = getWindowStart(30);

  const weeklyCalorieEntries = data.calorieLogs
    .filter((log) => {
      const loggedAt = new Date(log.logged_on).getTime();
      if (!Number.isFinite(loggedAt)) {
        return false;
      }

      return loggedAt >= sevenDaysAgo;
    });

  const monthlyCalorieEntries = data.calorieLogs
    .filter((log) => {
      const loggedAt = new Date(log.logged_on).getTime();
      return Number.isFinite(loggedAt) && loggedAt >= thirtyDaysAgo;
    });

  const weeklyCaloriesAverage = getAverageFromEntries(weeklyCalorieEntries.map((log) => log.calories));
  const monthlyCaloriesAverage = getAverageFromEntries(monthlyCalorieEntries.map((log) => log.calories));

  const weeklyWeightEntries = data.weightLogs.filter((log) => {
    const loggedAt = new Date(log.logged_on || log.log_date || "").getTime();
    return Number.isFinite(loggedAt) && loggedAt >= sevenDaysAgo;
  });

  const monthlyWeightEntries = data.weightLogs.filter((log) => {
    const loggedAt = new Date(log.logged_on || log.log_date || "").getTime();
    return Number.isFinite(loggedAt) && loggedAt >= thirtyDaysAgo;
  });

  const weeklyWeightAverage = getAverageFromEntries(weeklyWeightEntries.map((log) => log.weight_kg));
  const monthlyWeightAverage = getAverageFromEntries(monthlyWeightEntries.map((log) => log.weight_kg));

  const mostRecentWeight = data.weightLogs[0]?.weight_kg ?? null;
  const previousWeight = data.weightLogs[1]?.weight_kg ?? null;
  const weightDelta =
    mostRecentWeight !== null && previousWeight !== null ? mostRecentWeight - previousWeight : null;

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Workouts</p>
          <p className="mt-2 text-4xl font-bold text-zinc-950">{workoutCount}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Active Goals</p>
          <p className="mt-2 text-4xl font-bold text-zinc-950">{activeGoalsCount}</p>
          <p className="mt-1 text-xs text-zinc-500">{completedGoalsCount} completed</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Avg Weight (7 days)</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {weeklyWeightAverage !== null ? `${weeklyWeightAverage.toFixed(1)} kg` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {monthlyWeightAverage !== null
              ? `30-day avg: ${monthlyWeightAverage.toFixed(1)} kg`
              : "Uses only available entries"}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Avg Calories (7 days)</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {weeklyCaloriesAverage !== null ? Math.round(weeklyCaloriesAverage).toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Daily average over the last week</p>
          <p className="mt-1 text-xs text-zinc-500">
            {monthlyCaloriesAverage !== null
              ? `30-day avg: ${Math.round(monthlyCaloriesAverage).toLocaleString()}`
              : "Uses only available entries"}
          </p>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Weight Trend</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {weightDelta === null
              ? "Add at least two weight logs to see your trend."
              : weightDelta === 0
                ? "Your latest two weight logs are unchanged."
                : `Your latest weight is ${Math.abs(weightDelta).toFixed(1)} kg ${
                    weightDelta < 0 ? "lower" : "higher"
                  } than the previous log.`}
          </p>
          <Link
            href="/weight-tracker"
            className="mt-4 inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Open Weight Tracker
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Latest Workout</h2>
          {latestWorkout ? (
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">{latestWorkout.name}</p>
              <p>
                {latestWorkout.duration_minutes ?? latestWorkout.total_minutes ?? 0} minutes
                {typeof latestWorkout.calories_burned === "number"
                  ? ` • ${latestWorkout.calories_burned} kcal`
                  : ""}
              </p>
              <p className="text-zinc-500">
                {new Date(latestWorkout.workout_on || latestWorkout.workout_date || "").toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">No workout logged yet. Start your first session.</p>
          )}
          <Link
            href="/workouts"
            className="mt-4 inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Open Workouts
          </Link>
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

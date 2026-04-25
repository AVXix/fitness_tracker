import Link from "next/link";
import { getFitnessDashboardData } from "@/lib/fitness";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const RANGE_OPTIONS = [30, 60, 120] as const;
const DEFAULT_RANGE = 30;
const WORKOUT_METRIC_OPTIONS = ["sessions", "calories"] as const;
const DEFAULT_WORKOUT_METRIC = "sessions";

type WorkoutMetric = (typeof WORKOUT_METRIC_OPTIONS)[number];

type SearchParams = Record<string, string | string[] | undefined>;

type ExerciseAnalyticsRow = {
  muscle_group: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  created_at: string;
};

type WorkoutAnalyticsRow = {
  name: string | null;
  category: string | null;
  workout_type: string | null;
  duration_minutes: number | null;
  total_minutes: number | null;
  calories_burned: number | null;
  workout_on: string | null;
  workout_date: string | null;
};

function inferMuscleGroupFromWorkout(row: WorkoutAnalyticsRow) {
  const text = `${row.name ?? ""} ${row.category ?? ""} ${row.workout_type ?? ""}`.toLowerCase();
  if (/(chest|push|bench)/.test(text)) return "Chest";
  if (/(back|pull|row|deadlift)/.test(text)) return "Back";
  if (/(leg|quad|hamstring|squat|lunge)/.test(text)) return "Legs";
  if (/(shoulder|deltoid|overhead)/.test(text)) return "Shoulders";
  if (/(arm|bicep|tricep|curl)/.test(text)) return "Arms";
  if (/(glute|hip)/.test(text)) return "Glutes";
  if (/(core|abs|plank)/.test(text)) return "Core";
  if (/(lower body)/.test(text)) return "Legs";
  if (/(upper body)/.test(text)) return "Upper Body";
  return "Full Body";
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseRange(rawRange: string | undefined) {
  const parsed = Number(rawRange);
  if (!Number.isFinite(parsed) || !RANGE_OPTIONS.includes(parsed as (typeof RANGE_OPTIONS)[number])) {
    return DEFAULT_RANGE;
  }
  return parsed as (typeof RANGE_OPTIONS)[number];
}

function parseWorkoutMetric(rawMetric: string | undefined): WorkoutMetric {
  if (rawMetric === "calories") {
    return "calories";
  }
  return DEFAULT_WORKOUT_METRIC;
}

function buildDateKeys(days: number) {
  const result: string[] = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let index = days - 1; index >= 0; index -= 1) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - index);
    result.push(toDateKey(d));
  }
  return result;
}

function formatShortDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function linePoints(values: Array<number | null>, width: number, height: number) {
  const numericValues = values.filter((value): value is number => typeof value === "number");
  if (numericValues.length < 2) {
    return "";
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const span = Math.max(1, max - min);
  const xStep = values.length > 1 ? width / (values.length - 1) : 0;

  const points: string[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      return;
    }
    const x = Number((index * xStep).toFixed(2));
    const y = Number((height - ((value - min) / span) * height).toFixed(2));
    points.push(`${x},${y}`);
  });

  return points.join(" ");
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const selectedRange = parseRange(typeof params.range === "string" ? params.range : undefined);
  const selectedWorkoutMetric = parseWorkoutMetric(
    typeof params.workoutMetric === "string" ? params.workoutMetric : undefined
  );

  const dashboard = await getFitnessDashboardData(user.id);
  const dateKeys = buildDateKeys(selectedRange);
  const dateSet = new Set(dateKeys);
  const rangeStart = dateKeys[0];

  const latestWeightByDate = new Map<string, number>();
  for (const entry of dashboard.weightLogs) {
    const key = (entry.logged_on ?? entry.log_date ?? "").slice(0, 10);
    if (!key || !dateSet.has(key) || latestWeightByDate.has(key)) {
      continue;
    }
    latestWeightByDate.set(key, entry.weight_kg);
  }

  const caloriesByDate = new Map<string, number>();
  const proteinByDate = new Map<string, number>();
  const carbsByDate = new Map<string, number>();
  const fatByDate = new Map<string, number>();

  for (const entry of dashboard.calorieLogs) {
    const key = entry.logged_on.slice(0, 10);
    if (!dateSet.has(key)) {
      continue;
    }
    caloriesByDate.set(key, (caloriesByDate.get(key) ?? 0) + entry.calories);
    proteinByDate.set(key, (proteinByDate.get(key) ?? 0) + (entry.protein_g ?? 0));
    carbsByDate.set(key, (carbsByDate.get(key) ?? 0) + (entry.carbs_g ?? 0));
    fatByDate.set(key, (fatByDate.get(key) ?? 0) + (entry.fat_g ?? 0));
  }

  const weightSeries = dateKeys.map((key) => latestWeightByDate.get(key) ?? null);
  const calorieSeries = dateKeys.map((key) => caloriesByDate.get(key) ?? null);
  const weightPolyline = linePoints(weightSeries, 1000, 200);
  const caloriePolyline = linePoints(calorieSeries, 1000, 200);

  const workoutSessionsByDate = new Map<string, number>();
  const workoutCaloriesByDate = new Map<string, number>();

  const loggedMacroDays = dateKeys.filter((key) => caloriesByDate.has(key)).length;
  const macroDays = Math.max(1, loggedMacroDays);
  const avgProtein = Math.round(
    dateKeys.reduce((sum, key) => sum + (proteinByDate.get(key) ?? 0), 0) / macroDays
  );
  const avgCarbs = Math.round(dateKeys.reduce((sum, key) => sum + (carbsByDate.get(key) ?? 0), 0) / macroDays);
  const avgFat = Math.round(dateKeys.reduce((sum, key) => sum + (fatByDate.get(key) ?? 0), 0) / macroDays);

  const latestWeight = dashboard.weightLogs[0]?.weight_kg ?? 70;
  const proteinTarget = Math.round(latestWeight * 1.6);
  const fatTarget = Math.round(latestWeight * 0.8);
  const carbsTarget = Math.round(latestWeight * 3);

  const macroRows = [
    { label: "Protein", actual: avgProtein, target: proteinTarget, tone: "bg-emerald-500" },
    { label: "Carbs", actual: avgCarbs, target: carbsTarget, tone: "bg-blue-500" },
    { label: "Fat", actual: avgFat, target: fatTarget, tone: "bg-amber-500" },
  ];

  const supabase = await createSupabaseServerClient();
  let muscleRows: ExerciseAnalyticsRow[] = [];
  let workoutRows: WorkoutAnalyticsRow[] = [];
  if (supabase) {
    const [exerciseResult, workoutsResult] = await Promise.all([
      supabase
        .from("exercise_logs")
        .select("muscle_group, sets, reps, weight_kg, duration_seconds, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${rangeStart}T00:00:00.000Z`)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("workouts")
        .select("name, category, workout_type, duration_minutes, total_minutes, calories_burned, workout_on, workout_date")
        .eq("user_id", user.id)
        .or(`workout_on.gte.${rangeStart},workout_date.gte.${rangeStart}`)
        .order("workout_on", { ascending: false })
        .limit(1000),
    ]);

    muscleRows = (exerciseResult.data ?? []) as ExerciseAnalyticsRow[];
    workoutRows = (workoutsResult.data ?? []) as WorkoutAnalyticsRow[];
  }

  const muscleStats = new Map<string, { sessions: number; loadScore: number }>();
  for (const row of muscleRows) {
    const label = row.muscle_group?.trim() || "Unspecified";
    const sets = Math.max(1, row.sets ?? 1);
    const reps = Math.max(1, row.reps ?? 1);
    const weight = Math.max(1, row.weight_kg ?? 1);
    const durationMinutes = Math.max(0, (row.duration_seconds ?? 0) / 60);
    const loadScore = sets * reps * weight + durationMinutes;

    const current = muscleStats.get(label) ?? { sessions: 0, loadScore: 0 };
    current.sessions += 1;
    current.loadScore += loadScore;
    muscleStats.set(label, current);

    const exerciseKey = row.created_at.slice(0, 10);
    if (exerciseKey && dateSet.has(exerciseKey)) {
      workoutSessionsByDate.set(exerciseKey, (workoutSessionsByDate.get(exerciseKey) ?? 0) + 1);
    }
  }

  for (const row of workoutRows) {
    const workoutKey = (row.workout_on ?? row.workout_date ?? "").slice(0, 10);
    if (workoutKey && dateSet.has(workoutKey)) {
      workoutSessionsByDate.set(workoutKey, (workoutSessionsByDate.get(workoutKey) ?? 0) + 1);
      workoutCaloriesByDate.set(
        workoutKey,
        (workoutCaloriesByDate.get(workoutKey) ?? 0) + Math.max(0, row.calories_burned ?? 0)
      );
    }

    if (muscleRows.length > 0) {
      continue;
    }

    const label = inferMuscleGroupFromWorkout(row);
    const duration = Math.max(0, row.duration_minutes ?? row.total_minutes ?? 0);
    const caloriesBurned = Math.max(0, row.calories_burned ?? 0);
    const loadScore = Math.max(1, Math.round(duration * 1.8 + caloriesBurned * 0.4));

    const current = muscleStats.get(label) ?? { sessions: 0, loadScore: 0 };
    current.sessions += 1;
    current.loadScore += loadScore;
    muscleStats.set(label, current);
  }

  const muscleSummary = Array.from(muscleStats.entries())
    .map(([name, stats]) => ({
      name,
      sessions: stats.sessions,
      loadScore: Math.round(stats.loadScore),
    }))
    .sort((a, b) => b.loadScore - a.loadScore)
    .slice(0, 8);

  const maxMuscleLoad = Math.max(...muscleSummary.map((item) => item.loadScore), 1);
  const workoutSeries =
    selectedWorkoutMetric === "calories"
      ? dateKeys.map((key) => workoutCaloriesByDate.get(key) ?? null)
      : dateKeys.map((key) => workoutSessionsByDate.get(key) ?? null);
  const workoutPolyline = linePoints(workoutSeries, 1000, 200);
  const workoutEntries = workoutSeries.filter((value): value is number => value !== null);
  const avgWorkoutMetric =
    workoutEntries.length > 0
      ? Number((workoutEntries.reduce((sum, value) => sum + value, 0) / workoutEntries.length).toFixed(1))
      : 0;
  const workoutMetricLabel = selectedWorkoutMetric === "calories" ? "Avg workout cals/day" : "Avg workouts/day";
  const workoutMetricDescription =
    selectedWorkoutMetric === "calories"
      ? "Daily workout calories burned in the selected range."
      : "Daily workout session count in the selected range.";
  const workoutMetricSuffix = selectedWorkoutMetric === "calories" ? "kcal" : "sessions";
  const weightEntries = weightSeries.filter((value): value is number => value !== null);
  const calorieEntries = calorieSeries.filter((value): value is number => value !== null);
  const avgCalories =
    calorieEntries.length > 0 ? Math.round(calorieEntries.reduce((sum, value) => sum + value, 0) / calorieEntries.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track your trends, macro gaps, and training distribution for the selected range.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
          {RANGE_OPTIONS.map((range) => (
            <Link
              key={range}
              href={`/analytics?range=${range}&workoutMetric=${selectedWorkoutMetric}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedRange === range ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {range}d
            </Link>
          ))}
        </div>
      </div>

      {dashboard.setupRequired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Run the SQL migration to set up your database.
          {dashboard.errorMessage ? ` Error: ${dashboard.errorMessage}` : ""}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Weight entries</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{weightEntries.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Calorie avg/day</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{avgCalories.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{workoutMetricLabel}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">
            {selectedWorkoutMetric === "calories" ? avgWorkoutMetric.toLocaleString() : avgWorkoutMetric}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Weight trend ({selectedRange} days)</h2>
          <p className="mt-1 text-sm text-zinc-600">Daily logged weight points across the selected range.</p>
          <div className="mt-4 h-56 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            {weightPolyline ? (
              <svg viewBox="0 0 1000 200" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={weightPolyline}
                />
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Not enough weight data for this range.
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{formatShortDayLabel(dateKeys[0])}</span>
            <span>{formatShortDayLabel(dateKeys[dateKeys.length - 1])}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Calorie trend ({selectedRange} days)</h2>
          <p className="mt-1 text-sm text-zinc-600">Daily calories consumed from logged meals.</p>
          <div className="mt-4 h-56 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            {caloriePolyline ? (
              <svg viewBox="0 0 1000 200" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={caloriePolyline}
                />
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Not enough calorie data for this range.
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{formatShortDayLabel(dateKeys[0])}</span>
            <span>{formatShortDayLabel(dateKeys[dateKeys.length - 1])}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-950">Workout trend ({selectedRange} days)</h2>
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-xs">
              {WORKOUT_METRIC_OPTIONS.map((metric) => (
                <Link
                  key={metric}
                  href={`/analytics?range=${selectedRange}&workoutMetric=${metric}`}
                  className={`rounded-md px-2 py-1 font-medium capitalize transition ${
                    selectedWorkoutMetric === metric ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {metric}
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-600">{workoutMetricDescription}</p>
          <div className="mt-4 h-56 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            {workoutPolyline ? (
              <svg viewBox="0 0 1000 200" className="h-full w-full">
                <polyline
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={workoutPolyline}
                />
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Not enough workout data for this range.
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{formatShortDayLabel(dateKeys[0])}</span>
            <span>
              {formatShortDayLabel(dateKeys[dateKeys.length - 1])} • {workoutMetricSuffix}
            </span>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Overall macro coverage</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Average daily intake compared with target macros (targets based on latest weight).
          </p>
          <div className="mt-5 space-y-4">
            {macroRows.map((macro) => {
              const percent = Math.min(100, Math.round((macro.actual / Math.max(1, macro.target)) * 100));
              const shortage = Math.max(0, macro.target - macro.actual);
              return (
                <div key={macro.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <p className="font-medium text-zinc-800">{macro.label}</p>
                    <p className="text-zinc-600">
                      {macro.actual}g / {macro.target}g {shortage > 0 ? `(short by ${shortage}g)` : "(on target)"}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div className={`h-full rounded-full ${macro.tone}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Muscle group workload</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Top muscle groups worked in the last {selectedRange} days using session load score.
          </p>
          {muscleSummary.length > 0 ? (
            <div className="mt-5 space-y-3">
              {muscleSummary.map((item) => {
                const width = Math.max(6, Math.round((item.loadScore / maxMuscleLoad) * 100));
                return (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <p className="font-medium text-zinc-800">{item.name}</p>
                      <p className="text-zinc-600">
                        {item.sessions} sessions • score {item.loadScore}
                      </p>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600">No workout logs for this range yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getFitnessDashboardData } from "@/lib/fitness";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const RANGE_OPTIONS = [30, 60, 120] as const;
const DEFAULT_RANGE = 30;

type SearchParams = Record<string, string | string[] | undefined>;

type ExerciseAnalyticsRow = {
  muscle_group: string | null;
  exercise_name?: string | null;
  exercise_type?: string | null;
  cardio_intensity?: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  distance_km?: number | null;
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

const TRACKED_MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Glutes"] as const;

function normalizeMuscleGroup(label: string) {
  const text = label.toLowerCase();
  if (text.includes("chest") || text.includes("pec")) return "Chest";
  if (
    text.includes("back") ||
    text.includes("lat") ||
    text.includes("rhomboid") ||
    text.includes("trap") ||
    text.includes("rear delt") ||
    text.includes("front delt") ||
    text.includes("side delt") ||
    text.includes("upper back") ||
    text.includes("lower back")
  ) return "Back";
  if (text.includes("leg") || text.includes("quad") || text.includes("hamstring") || text.includes("calf") || text.includes("adductor") || text.includes("abductor")) return "Legs";
  if (text.includes("shoulder") || text.includes("deltoid") || text.includes("delt")) return "Shoulders";
  if (text.includes("arm") || text.includes("bicep") || text.includes("tricep") || text.includes("forearm")) return "Arms";
  if (text.includes("core") || text.includes("abs") || text.includes("oblique") || text.includes("transverse")) return "Core";
  if (text.includes("glute") || text.includes("hip")) return "Glutes";
  return null;
}

function normalizeCardioIntensity(label: string | null | undefined) {
  const text = String(label ?? "").trim().toLowerCase();
  if (text.includes("low")) return "Low";
  if (text.includes("moderate")) return "Moderate";
  if (text.includes("high") || text.includes("hiit") || text.includes("vigorous")) return "High";
  return "Unknown";
}

function inferMuscleGroupFromWorkout(row: WorkoutAnalyticsRow) {
  const text = `${row.name ?? ""} ${row.category ?? ""} ${row.workout_type ?? ""}`.toLowerCase();
  if (/(chest|push|bench|pec)/.test(text)) return "Chest";
  if (/(back|pull|row|deadlift|lat|rhomboid|trap|rear delt|upper back|lower back)/.test(text)) return "Back";
  if (/(leg|quad|hamstring|squat|lunge|calf|adductor|abductor)/.test(text)) return "Legs";
  if (/(shoulder|deltoid|delt|front delt|side delt|overhead)/.test(text)) return "Shoulders";
  if (/(arm|bicep|tricep|curl|forearm)/.test(text)) return "Arms";
  if (/(glute|hip)/.test(text)) return "Glutes";
  if (/(core|abs|oblique|transverse|plank)/.test(text)) return "Core";
  if (/(lower body)/.test(text)) return "Legs";
  if (/(upper body)/.test(text)) return "Back";
  if (/(full body)/.test(text)) return "Full Body";
  return null;
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

function estimateMaintenanceCalories(params: {
  dateKeys: string[];
  caloriesByDate: Map<string, number>;
  latestWeightByDate: Map<string, number>;
}) {
  const { dateKeys, caloriesByDate, latestWeightByDate } = params;
  const windowDays = 14;
  const stableWindowAverages: number[] = [];
  let stableDays = 0;

  for (let start = 0; start <= dateKeys.length - windowDays; start += 1) {
    const windowKeys = dateKeys.slice(start, start + windowDays);
    const calorieValues = windowKeys
      .map((key) => caloriesByDate.get(key))
      .filter((value): value is number => typeof value === "number");

    const weightPoints = windowKeys
      .map((key, index) => ({ index, weight: latestWeightByDate.get(key) ?? null }))
      .filter((entry): entry is { index: number; weight: number } => entry.weight !== null);

    if (calorieValues.length < 10 || weightPoints.length < 2) {
      continue;
    }

    const first = weightPoints[0];
    const last = weightPoints[weightPoints.length - 1];
    const spanDays = Math.max(1, last.index - first.index + 1);
    const deltaKg = last.weight - first.weight;
    const percentChange = Math.abs((deltaKg / Math.max(1, first.weight)) * 100);
    const weeklyChangeKg = Math.abs((deltaKg / spanDays) * 7);

    if (percentChange <= 0.4 && weeklyChangeKg <= 0.2) {
      const avgCalories = calorieValues.reduce((sum, value) => sum + value, 0) / calorieValues.length;
      stableWindowAverages.push(avgCalories);
      stableDays += windowKeys.length;
    }
  }

  if (stableWindowAverages.length > 0) {
    const estimatedCalories = Math.round(
      stableWindowAverages.reduce((sum, value) => sum + value, 0) / stableWindowAverages.length
    );
    const confidence = stableWindowAverages.length >= 3 ? "high" : stableWindowAverages.length >= 2 ? "medium" : "low";
    const note =
      confidence === "high"
        ? "Based on multiple stable-weight windows."
        : confidence === "medium"
          ? "Based on some stable-weight windows."
          : "Limited stable-weight data; estimate may shift with more logs.";

    return {
      calories: estimatedCalories,
      confidence,
      note,
      stableWindowCount: stableWindowAverages.length,
      stableDays,
    };
  }

  const calorieEntries = dateKeys
    .map((key) => caloriesByDate.get(key))
    .filter((value): value is number => typeof value === "number");
  const weightEntries = dateKeys
    .map((key) => latestWeightByDate.get(key))
    .filter((value): value is number => typeof value === "number");

  if (calorieEntries.length >= 10 && weightEntries.length >= 2) {
    const estimatedCalories = Math.round(
      calorieEntries.reduce((sum, value) => sum + value, 0) / calorieEntries.length
    );
    const weightDrift = weightEntries[weightEntries.length - 1] - weightEntries[0];
    const note = `No stable window found yet (weight drift ${weightDrift >= 0 ? "+" : ""}${weightDrift.toFixed(1)} kg).`;

    return {
      calories: estimatedCalories,
      confidence: "low",
      note,
      stableWindowCount: 0,
      stableDays: 0,
    };
  }

  return {
    calories: null,
    confidence: "low",
    note: "Need at least 10 calorie days and 2 weight logs in range.",
    stableWindowCount: 0,
    stableDays: 0,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const selectedRange = parseRange(typeof params.range === "string" ? params.range : undefined);

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
  let recommendationRows: ExerciseAnalyticsRow[] = [];
  let workoutRows: WorkoutAnalyticsRow[] = [];
  if (supabase) {
    const [exerciseResult, recommendationResult, workoutsResult] = await Promise.all([
      supabase
        .from("exercise_logs")
        .select("muscle_group, exercise_name, exercise_type, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at")
        .eq("user_id", user.id)
        .gte("created_at", `${rangeStart}T00:00:00.000Z`)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("exercise_logs")
        .select("muscle_group, exercise_name, exercise_type, cardio_intensity, sets, reps, weight_kg, duration_seconds, distance_km, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("workouts")
        .select("name, category, workout_type, duration_minutes, total_minutes, calories_burned, workout_on, workout_date")
        .eq("user_id", user.id)
        .or(`workout_on.gte.${rangeStart},workout_date.gte.${rangeStart}`)
        .order("workout_on", { ascending: false })
        .limit(1000),
    ]);

    muscleRows = (exerciseResult.data ?? []) as ExerciseAnalyticsRow[];
    recommendationRows = (recommendationResult.data ?? []) as ExerciseAnalyticsRow[];
    workoutRows = (workoutsResult.data ?? []) as WorkoutAnalyticsRow[];
  }

  const muscleStats = new Map<string, { sessions: number; loadScore: number }>(
    TRACKED_MUSCLE_GROUPS.map((name) => [name, { sessions: 0, loadScore: 0 }])
  );

  const cardioIntensityCounts = new Map<string, number>([
    ["Low", 0],
    ["Moderate", 0],
    ["High", 0],
    ["Unknown", 0],
  ]);

  for (const row of muscleRows) {
    const normalizedLabel = normalizeMuscleGroup(row.muscle_group ?? "") || normalizeMuscleGroup(row.exercise_name ?? "");
    const isCardio = String(row.exercise_type ?? "").toLowerCase() === "cardio";
    const sets = Math.max(1, row.sets ?? 1);
    const reps = Math.max(1, row.reps ?? 1);
    const weight = Math.max(0, row.weight_kg ?? 0);
    const durationMinutes = Math.max(0, (row.duration_seconds ?? 0) / 60);
    const distanceKm = Math.max(0, row.distance_km ?? 0);
    const loadScore = isCardio
      ? Math.round(durationMinutes * 1.2 + distanceKm * 18)
      : Math.round(sets * reps * Math.max(4, weight * 0.6));

    if (isCardio) {
      const intensity = normalizeCardioIntensity(row.cardio_intensity);
      cardioIntensityCounts.set(intensity, (cardioIntensityCounts.get(intensity) ?? 0) + 1);
    }

    if (!normalizedLabel) {
      continue;
    }

    const current = muscleStats.get(normalizedLabel) ?? { sessions: 0, loadScore: 0 };
    current.sessions += 1;
    current.loadScore += Math.max(1, loadScore);
    muscleStats.set(normalizedLabel, current);

  }

  for (const row of workoutRows) {
    if (muscleRows.length > 0) {
      continue;
    }

    const label = inferMuscleGroupFromWorkout(row);
    if (!label) {
      continue;
    }
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
      avgSessionsPerWeek: Number(((stats.sessions / selectedRange) * 7).toFixed(1)),
      loadScore: Math.round(stats.loadScore),
    }))
    .filter((item) => item.sessions > 0)
    .sort((a, b) => b.loadScore - a.loadScore)
    .slice(0, TRACKED_MUSCLE_GROUPS.length);

  const sessionsByMuscle = new Map<string, number>(
    TRACKED_MUSCLE_GROUPS.map((name) => [name, muscleStats.get(name)?.sessions ?? 0])
  );

  const exerciseCountsByMuscle = new Map<string, Map<string, number>>();
  for (const row of recommendationRows) {
    const normalized = normalizeMuscleGroup(row.muscle_group ?? "");
    const exerciseName = String(row.exercise_name ?? "").trim();
    if (!normalized || !exerciseName) {
      continue;
    }

    const counts = exerciseCountsByMuscle.get(normalized) ?? new Map<string, number>();
    counts.set(exerciseName, (counts.get(exerciseName) ?? 0) + 1);
    exerciseCountsByMuscle.set(normalized, counts);
  }

  const getTopExercisesForMuscle = (muscle: string, limit: number) => {
    const counts = exerciseCountsByMuscle.get(muscle);
    if (!counts) {
      return [] as string[];
    }

    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        return a[0].localeCompare(b[0]);
      })
      .slice(0, limit)
      .map(([name]) => name);
  };

  const underutilizedMuscleGroups = TRACKED_MUSCLE_GROUPS.map((name) => ({
    name,
    sessions: sessionsByMuscle.get(name) ?? 0,
    avgSessionsPerWeek: Number((((sessionsByMuscle.get(name) ?? 0) / selectedRange) * 7).toFixed(1)),
    exercises: getTopExercisesForMuscle(name, 3),
  }))
    .sort((a, b) => a.avgSessionsPerWeek - b.avgSessionsPerWeek)
    .slice(0, 3);

  const ignoredMuscleGroups = underutilizedMuscleGroups
    .filter((item) => item.sessions === 0)
    .map((item) => item.name);

  const weeklyCardioIntensity = ["Low", "Moderate", "High", "Unknown"].map((name) => {
    const sessions = cardioIntensityCounts.get(name) ?? 0;
    return {
      name,
      sessions,
      avgSessionsPerWeek: Number(((sessions / selectedRange) * 7).toFixed(1)),
    };
  });

  const maxCardioIntensitySessions = Math.max(...weeklyCardioIntensity.map((item) => item.sessions), 1);

  const maxMuscleLoad = Math.max(...muscleSummary.map((item) => item.loadScore), 1);
  const workoutMetricLabel = `Workouts (${selectedRange}d)`;
  const workoutMetricValue = workoutRows.length;
  const weightEntries = weightSeries.filter((value): value is number => value !== null);
  const calorieEntries = calorieSeries.filter((value): value is number => value !== null);
  const avgCalories =
    calorieEntries.length > 0 ? Math.round(calorieEntries.reduce((sum, value) => sum + value, 0) / calorieEntries.length) : 0;
  const maintenanceEstimate = estimateMaintenanceCalories({
    dateKeys,
    caloriesByDate,
    latestWeightByDate,
  });
  const maintenanceConfidenceTone =
    maintenanceEstimate.confidence === "high"
      ? "text-emerald-600"
      : maintenanceEstimate.confidence === "medium"
        ? "text-amber-600"
        : "text-zinc-500";

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
              href={`/analytics?range=${range}`}
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

      <div className="grid gap-4 md:grid-cols-4">
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
          <p className="mt-2 text-3xl font-semibold text-zinc-950">{workoutMetricValue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Maintenance est/day</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">
            {maintenanceEstimate.calories !== null ? maintenanceEstimate.calories.toLocaleString() : "-"}
          </p>
          <p className={`mt-1 text-xs ${maintenanceConfidenceTone}`}>
            {maintenanceEstimate.confidence} confidence
            {maintenanceEstimate.stableWindowCount > 0
              ? ` • ${maintenanceEstimate.stableWindowCount} stable windows`
              : ""}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{maintenanceEstimate.note}</p>
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
          <h2 className="text-lg font-semibold text-zinc-950">Under-utilized muscles ({selectedRange} days)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Muscles with the lowest weekly frequency, plus ignored muscle parts in this range.
          </p>
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            {underutilizedMuscleGroups.length > 0 ? (
              <div className="space-y-3">
                {underutilizedMuscleGroups.map((item) => (
                  <div key={item.name} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Avg {item.avgSessionsPerWeek} sessions/week ({item.sessions} total sessions)
                    </p>
                    <p className="mt-2 text-sm text-zinc-700">
                      Suggested exercises: {item.exercises.length > 0 ? item.exercises.join(", ") : "No saved exercises for this muscle yet. Log exercises in Workouts to build recommendations."}
                    </p>
                  </div>
                ))}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Ignored muscle parts: {ignoredMuscleGroups.length > 0 ? ignoredMuscleGroups.join(", ") : "None. Every tracked muscle got at least one session."}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No workout logs available yet to calculate under-utilized muscles.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
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
            Load score and weekly frequency for each trained muscle group.
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
                        {item.sessions} sessions • {item.avgSessionsPerWeek}/week • score {item.loadScore}
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

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-950">Weekly cardio intensity</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Average cardio sessions per week by intensity (Low, Moderate, High).
          </p>
          <div className="mt-5 space-y-3">
            {weeklyCardioIntensity.map((item) => {
              const width = Math.max(6, Math.round((item.sessions / maxCardioIntensitySessions) * 100));
              const tone =
                item.name === "High"
                  ? "bg-red-500"
                  : item.name === "Moderate"
                    ? "bg-amber-500"
                    : item.name === "Low"
                      ? "bg-blue-500"
                      : "bg-zinc-400";

              return (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <p className="font-medium text-zinc-800">{item.name}</p>
                    <p className="text-zinc-600">
                      {item.sessions} sessions • {item.avgSessionsPerWeek}/week
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-100">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

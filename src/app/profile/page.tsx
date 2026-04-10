import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import {
  addGoalAction,
  addWeightLogAction,
  addWorkoutAction,
  saveProfileAction,
} from "@/app/fitness-actions";
import { getFitnessDashboardData } from "@/lib/fitness";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Login required</h1>
          <p className="mt-3 text-zinc-600">
            Sign in first to view your Supabase account details.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/login" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Login
            </Link>
            <Link href="/" className="rounded-xl border border-zinc-300 px-4 py-2.5 text-zinc-900">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const dashboard = await getFitnessDashboardData(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Supabase auth is connected, and this page now uses user-owned fitness tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm">
            Home
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white">
              Logout
            </button>
          </form>
        </div>
      </header>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 text-sm text-zinc-700">
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{user.email ?? "No email available"}</dd>
          </div>
          <div>
            <dt className="font-medium">Name</dt>
            <dd>{user.user_metadata.name ?? "Not set yet"}</dd>
          </div>
          <div>
            <dt className="font-medium">User ID</dt>
            <dd className="break-all">{user.id}</dd>
          </div>
          <div>
            <dt className="font-medium">Last sign-in</dt>
            <dd>
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : "First session"}
            </dd>
          </div>
        </dl>

        {dashboard.setupRequired ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Run the SQL migration in `supabase/migrations/20260410150000_fitness_tracker_schema.sql`
            inside your Supabase SQL editor, then refresh this page.
            {dashboard.errorMessage ? ` Error: ${dashboard.errorMessage}` : ""}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Profile details</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Stored in the `profiles` table with your Supabase auth user ID.
          </p>

          <form action={saveProfileAction} className="mt-5 space-y-4">
            <div>
              <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-zinc-800">
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                defaultValue={dashboard.profile?.display_name ?? user.user_metadata.name ?? ""}
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="age" className="mb-1 block text-sm font-medium text-zinc-800">
                  Age
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="13"
                  defaultValue={dashboard.profile?.age ?? ""}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label htmlFor="heightCm" className="mb-1 block text-sm font-medium text-zinc-800">
                  Height (cm)
                </label>
                <input
                  id="heightCm"
                  name="heightCm"
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={dashboard.profile?.height_cm ?? ""}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gender" className="mb-1 block text-sm font-medium text-zinc-800">
                  Gender
                </label>
                <input
                  id="gender"
                  name="gender"
                  defaultValue={dashboard.profile?.gender ?? ""}
                  placeholder="Male, female, non-binary..."
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label htmlFor="fitnessLevel" className="mb-1 block text-sm font-medium text-zinc-800">
                  Fitness level
                </label>
                <input
                  id="fitnessLevel"
                  name="fitnessLevel"
                  defaultValue={dashboard.profile?.fitness_level ?? ""}
                  placeholder="Beginner, intermediate, advanced"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
            </div>

            <div>
              <label htmlFor="primaryGoal" className="mb-1 block text-sm font-medium text-zinc-800">
                Primary goal
              </label>
              <input
                id="primaryGoal"
                name="primaryGoal"
                defaultValue={dashboard.profile?.primary_goal ?? ""}
                placeholder="Build muscle, lose weight, run 5k..."
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>

            <div>
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-zinc-800">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                defaultValue={dashboard.profile?.bio ?? ""}
                placeholder="A short note about your current fitness journey"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>

            <button type="submit" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Save profile
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Add a goal</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Each goal row is tied to `user_id = auth.uid()` through Supabase RLS.
          </p>

          <form action={addGoalAction} className="mt-5 space-y-4">
            <input
              name="title"
              placeholder="Lose 5 kg"
              required
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="goalType"
                placeholder="weight-loss, strength, endurance"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="category"
                placeholder="weight, strength, cardio"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="currentValue"
                type="number"
                step="0.01"
                placeholder="Current progress"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="targetDate"
                type="date"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="targetValue"
                type="number"
                step="0.01"
                placeholder="5"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="targetUnit"
                placeholder="kg, reps, km"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional notes"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
            <button type="submit" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Add goal
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Log weight</h2>
          <form action={addWeightLogAction} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="loggedOn"
                type="date"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="weightKg"
                type="number"
                step="0.01"
                min="1"
                placeholder="72.5"
                required
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>
            <input
              name="note"
              placeholder="Morning weigh-in"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
            <button type="submit" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Save weight
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {dashboard.weightLogs.length === 0 ? (
              <p className="text-sm text-zinc-500">No weight entries yet.</p>
            ) : (
              dashboard.weightLogs.map((entry) => (
                <div key={entry.id} className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p className="font-medium">{entry.weight_kg} kg</p>
                  <p>{entry.log_date ?? entry.logged_on}</p>
                  {entry.note ? <p className="text-zinc-500">{entry.note}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Log workout</h2>
          <form action={addWorkoutAction} className="mt-5 space-y-4">
            <input
              name="name"
              placeholder="Upper body day"
              required
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                name="workoutOn"
                type="date"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="durationMinutes"
                type="number"
                min="1"
                placeholder="45"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
              <input
                name="caloriesBurned"
                type="number"
                min="0"
                placeholder="320"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              />
            </div>
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional workout notes"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
            <button type="submit" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Save workout
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {dashboard.workouts.length === 0 ? (
              <p className="text-sm text-zinc-500">No workouts logged yet.</p>
            ) : (
              dashboard.workouts.map((workout) => (
                <div key={workout.id} className="rounded-2xl bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p className="font-medium">{workout.name}</p>
                  <p>{workout.workout_date ?? workout.workout_on}</p>
                  <p>
                    {(workout.total_minutes ?? workout.duration_minutes)
                      ? `${workout.total_minutes ?? workout.duration_minutes} min`
                      : "No duration"}
                    {workout.calories_burned ? ` • ${workout.calories_burned} cal` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Recent goals</h2>
        <div className="mt-4 space-y-3">
          {dashboard.goals.length === 0 ? (
            <p className="text-sm text-zinc-500">No goals yet.</p>
          ) : (
            dashboard.goals.map((goal) => (
              <div key={goal.id} className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-zinc-500">
                  {(goal.goal_type ?? goal.category)} • {goal.status}
                  {goal.current_value !== null ? ` • current ${goal.current_value}` : ""}
                  {goal.target_value !== null && goal.target_unit
                    ? ` • ${goal.target_value} ${goal.target_unit}`
                    : ""}
                  {(goal.end_date ?? goal.target_date) ? ` • target ${goal.end_date ?? goal.target_date}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

import { WeightTracker } from "@/components/WeightTracker";
import { CalorieTracker } from "@/components/CalorieTracker";
import { addWeightLogAction, addCalorieLogAction } from "@/app/fitness-actions";
import { getFitnessDashboardData } from "@/lib/fitness";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function WeightTrackerPage() {
  const user = await getCurrentUser();
  const dashboard = await getFitnessDashboardData(user!.id);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Weight & Calorie Tracker</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Track your daily weight and calorie intake all in one place
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Weight Tracker Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-950">Weight Tracker</h2>

          {/* Log Weight Form */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-zinc-950">Log Weight</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Record your daily weight
            </p>

            <form action={addWeightLogAction} className="mt-5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="loggedOn" className="mb-2 block text-sm font-medium text-zinc-800">
                    Date
                  </label>
                  <input
                    id="loggedOn"
                    name="loggedOn"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label htmlFor="weightKg" className="mb-2 block text-sm font-medium text-zinc-800">
                    Weight (kg) *
                  </label>
                  <input
                    id="weightKg"
                    name="weightKg"
                    type="number"
                    step="0.1"
                    min="30"
                    max="200"
                    placeholder="65.5"
                    required
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-white font-medium hover:bg-zinc-800"
                >
                  Log Weight
                </button>
              </div>
            </form>
          </div>

          {/* Weight Stats and History */}
          <WeightTracker data={dashboard} />
        </div>

        {/* Calorie Tracker Column */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-950">Calorie Tracker</h2>

          {/* Log Calorie Form */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-zinc-950">Log Meal</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Record your food and calorie intake
            </p>

            <form action={addCalorieLogAction} className="mt-5 space-y-4">
              <div>
                <label htmlFor="loggedOnCalorie" className="mb-2 block text-sm font-medium text-zinc-800">
                  Date
                </label>
                <input
                  id="loggedOnCalorie"
                  name="loggedOn"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label htmlFor="calories" className="mb-2 block text-sm font-medium text-zinc-800">
                  Calories *
                </label>
                <input
                  id="calories"
                  name="calories"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="450"
                  required
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>

              {/* Macros */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-600 uppercase">Macros (optional)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="proteinG" className="mb-1 block text-xs font-medium text-zinc-700">
                      Protein (g)
                    </label>
                    <input
                      id="proteinG"
                      name="proteinG"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="25"
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="carbsG" className="mb-1 block text-xs font-medium text-zinc-700">
                      Carbs (g)
                    </label>
                    <input
                      id="carbsG"
                      name="carbsG"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="45"
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="fatG" className="mb-1 block text-xs font-medium text-zinc-700">
                      Fat (g)
                    </label>
                    <input
                      id="fatG"
                      name="fatG"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="15"
                      className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-white font-medium hover:bg-zinc-800"
              >
                Log Calories
              </button>
            </form>
          </div>

          {/* Calorie Stats */}
          <CalorieTracker data={dashboard} />
        </div>
      </div>
    </div>
  );
}

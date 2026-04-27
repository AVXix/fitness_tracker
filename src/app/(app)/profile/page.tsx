import { saveProfileAction } from "@/app/actions/profile-actions";
import { TrainerProfileFields } from "@/components/TrainerProfileFields";
import { getFitnessDashboardData } from "@/lib/fitness";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const dashboard = await getFitnessDashboardData(user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Manage your account information
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Account Information</h2>
        <dl className="mt-4 space-y-3 text-sm text-zinc-700">
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{user?.email ?? "No email available"}</dd>
          </div>
          <div>
            <dt className="font-medium">Name</dt>
            <dd>{user?.user_metadata.name ?? "Not set yet"}</dd>
          </div>
          <div>
            <dt className="font-medium">Last sign-in</dt>
            <dd>
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : "First session"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-zinc-950">Profile Details</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Update your fitness profile information
        </p>

        <form action={saveProfileAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-zinc-800">
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={dashboard.profile?.display_name ?? user?.user_metadata.name ?? ""}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="age" className="mb-2 block text-sm font-medium text-zinc-800">
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
              <label htmlFor="heightCm" className="mb-2 block text-sm font-medium text-zinc-800">
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
              <label htmlFor="gender" className="mb-2 block text-sm font-medium text-zinc-800">
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
              <label htmlFor="fitnessLevel" className="mb-2 block text-sm font-medium text-zinc-800">
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
            <label htmlFor="primaryGoal" className="mb-2 block text-sm font-medium text-zinc-800">
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
            <label htmlFor="bio" className="mb-2 block text-sm font-medium text-zinc-800">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={dashboard.profile?.bio ?? ""}
              placeholder="A short note about your fitness journey"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            />
          </div>

          <TrainerProfileFields
            defaultIsTrainer={!!dashboard.profile?.is_trainer}
            defaultTrainerContact={dashboard.profile?.trainer_contact ?? ""}
          />

          <button type="submit" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
            Save profile
          </button>
        </form>
      </div>
    </div>
  );
}

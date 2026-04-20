import { getFitnessDashboardData } from "@/lib/fitness";
import { getCurrentUser } from "@/lib/supabase/server";
import { Dashboard } from "@/components/Dashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const dashboard = await getFitnessDashboardData(user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-zinc-600">
          Welcome back, {user?.user_metadata.name || user?.email}
        </p>
      </div>

      {dashboard.setupRequired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Run the SQL migration to set up your database.
          {dashboard.errorMessage ? ` Error: ${dashboard.errorMessage}` : ""}
        </div>
      )}

      <Dashboard data={dashboard} />
    </div>
  );
}

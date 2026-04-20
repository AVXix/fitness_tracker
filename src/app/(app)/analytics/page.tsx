export default async function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View your fitness analytics and insights
        </p>
      </div>

      {/* Analytics overview with charts will go here */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-600">Coming soon - Analytics section</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-zinc-600">Coming soon - Insights section</p>
        </div>
      </div>
    </div>
  );
}

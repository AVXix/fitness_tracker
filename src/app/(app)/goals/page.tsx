import { requireUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoalsPageContent } from "@/components/GoalsPageContent";

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  target_value: number | null;
  current_value: number | null;
  target_unit: string | null;
  status: string;
  ai_advice: string | null;
  is_completed: boolean;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGoalRow(row: Record<string, unknown>): Goal {
  const status = typeof row.status === "string" && row.status ? row.status : "active";

  return {
    id: String(row.id ?? ""),
    title: typeof row.title === "string" && row.title ? row.title : "Untitled goal",
    target_date: typeof row.target_date === "string" ? row.target_date : null,
    target_value: parseOptionalNumber(row.target_value),
    current_value: parseOptionalNumber(row.current_value),
    target_unit: typeof row.target_unit === "string" ? row.target_unit : null,
    status,
    ai_advice: typeof row.ai_advice === "string" ? row.ai_advice : null,
    is_completed: row.is_completed === true || status === "completed",
  };
}

async function loadGoals(userId: string): Promise<Goal[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const queryAttempts = [
    "id, title, target_date, target_value, current_value, target_unit, status, ai_advice, is_completed",
    "id, title, target_date, target_value, current_value, target_unit, status, is_completed",
    "id, title, target_date, target_value, current_value, target_unit, status, ai_advice",
    "id, title, target_date, target_value, current_value, target_unit, status",
    "id, title, target_date, target_value, target_unit, status, ai_advice, is_completed",
    "id, title, target_date, target_value, target_unit, status, is_completed",
    "id, title, target_date, target_value, target_unit, status, ai_advice",
    "id, title, target_date, status",
  ];

  for (const selectShape of queryAttempts) {
    const result = await supabase
      .from("goals")
      .select(selectShape)
      .eq("user_id", userId)
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (!result.error) {
      return (result.data ?? []).map((row) => normalizeGoalRow(row as unknown as Record<string, unknown>));
    }
  }

  return [];
}

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await loadGoals(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Set and track your fitness goals with AI-powered advice
          </p>
        </div>
      </div>

      <GoalsPageContent goals={goals} />
    </div>
  );
}

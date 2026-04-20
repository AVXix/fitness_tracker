import { requireUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GoalsPageContent } from "@/components/GoalsPageContent";

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
  ai_advice: string | null;
  is_completed: boolean;
}

export default async function GoalsPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  let goals: Goal[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("goals")
      .select("id, title, target_date, status, ai_advice, is_completed")
      .eq("user_id", user.id)
      .order("is_completed", { ascending: true })
      .order("target_date", { ascending: true, nullsFirst: false });

    goals = data || [];
  }

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

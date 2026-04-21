"use client";

import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";

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

interface GoalsPageContentProps {
  goals: Goal[];
}

export function GoalsPageContent({ goals }: GoalsPageContentProps) {
  const isCompletedGoal = (goal: Goal) => goal.is_completed || goal.status === "completed";

  const activeGoals = goals.filter((g) => !isCompletedGoal(g));
  const completedGoals = goals.filter((g) => isCompletedGoal(g));

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
        <GoalForm />
      </div>

      {/* Active Goals Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Active Goals ({activeGoals.length})
        </h2>
        {activeGoals.length > 0 ? (
          <div className="grid gap-4">
            {activeGoals.map((goal) => (
              <div key={goal.id}>
                <GoalCard goal={goal} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No active goals yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create your first goal to get started!
            </p>
          </div>
        )}
      </div>

      {/* Completed Goals Section */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid gap-4">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

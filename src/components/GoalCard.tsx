"use client";

import { useState, useRef } from "react";
import { completeGoalAction } from "@/app/fitness-actions";

interface Goal {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
  ai_advice: string | null;
  is_completed: boolean;
}

export function GoalCard({ goal }: { goal: Goal }) {
  const [showAdvice, setShowAdvice] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const daysUntilDeadline = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleComplete = () => {
    const formData = new FormData();
    formData.append("goalId", goal.id);
    completeGoalAction(formData);
  };

  const deadlineText =
    daysUntilDeadline !== null
      ? daysUntilDeadline > 0
        ? `${daysUntilDeadline} days left`
        : daysUntilDeadline === 0
          ? "Due today"
          : `${Math.abs(daysUntilDeadline)} days overdue`
      : "No deadline";

  const deadlineColor =
    daysUntilDeadline !== null
      ? daysUntilDeadline <= 0
        ? "text-red-600"
        : daysUntilDeadline <= 7
          ? "text-amber-600"
          : "text-green-600"
      : "text-gray-500";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
          <p className={`text-sm mt-1 ${deadlineColor}`}>{deadlineText}</p>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              goal.is_completed
                ? "bg-green-100 text-green-700"
                : goal.status === "paused"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {goal.is_completed ? "Completed" : goal.status || "Active"}
          </span>
        </div>
      </div>

      {/* AI Advice Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowAdvice(!showAdvice)}
          className="w-full text-left px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200 text-purple-700 text-sm font-medium hover:bg-purple-100 transition-colors"
        >
          {showAdvice ? "▼" : "▶"} AI Advice for this Goal
        </button>

        {showAdvice && (
          <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded text-sm text-gray-700 whitespace-pre-wrap">
            {goal.ai_advice || (
              <span className="text-purple-600">
                No advice yet. Click &quot;Get Advice&quot; to generate fitness tips for
                this goal.
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          disabled={goal.is_completed}
          className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
            goal.is_completed
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {goal.is_completed ? "✓ Completed" : "Mark Complete"}
        </button>
        <button className="flex-1 px-3 py-2 rounded text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors">
          Edit
        </button>
      </div>

      <form ref={formRef} style={{ display: "none" }}>
        <input type="hidden" name="goalId" value={goal.id} />
      </form>
    </div>
  );
}

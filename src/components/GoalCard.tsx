"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  toggleGoalCompletionAction,
  deleteGoalAction,
  getGoalAIAdviceAction,
  addGoalProgressAction,
} from "@/app/fitness-actions";

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

export function GoalCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [showAdvice, setShowAdvice] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [progressDelta, setProgressDelta] = useState("");
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(goal.is_completed || goal.status === "completed");
  const [currentProgress, setCurrentProgress] = useState(goal.current_value ?? 0);
  const formRef = useRef<HTMLFormElement>(null);

  const daysUntilDeadline = goal.target_date
    ? Math.ceil(
        (new Date(goal.target_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleToggleComplete = async (checked: boolean) => {
    if (isCompleting || isAddingProgress) {
      return;
    }

    const previous = isCompleted;
    setIsCompleted(checked);
    setIsCompleting(true);

    const formData = new FormData();
    formData.append("goalId", goal.id);
    formData.append("completed", String(checked));

    const ok = await toggleGoalCompletionAction(formData);
    if (!ok) {
      setIsCompleted(previous);
    }

    router.refresh();
    setIsCompleting(false);
  };

  const handleAddProgress = async () => {
    if (isAddingProgress || isCompleting || isCompleted) {
      return;
    }

    const delta = Number(progressDelta);
    if (!Number.isFinite(delta) || delta <= 0) {
      setProgressError("Enter a valid positive number.");
      return;
    }

    setProgressError(null);
    setIsAddingProgress(true);
    const formData = new FormData();
    formData.append("goalId", goal.id);
    formData.append("progressDelta", String(delta));

    const result = await addGoalProgressAction(formData);

    if (result.ok && typeof result.currentValue === "number") {
      setCurrentProgress(result.currentValue);
      setIsCompleted(result.completed);
      setProgressDelta("");
    } else {
      setProgressError(result.error || "Could not save progress right now. Try again.");
    }

    router.refresh();
    setIsAddingProgress(false);
  };

  const handleDelete = async () => {
    const shouldDelete = window.confirm("Delete this goal? This cannot be undone.");
    if (!shouldDelete) {
      return;
    }

    const formData = new FormData();
    formData.append("goalId", goal.id);
    await deleteGoalAction(formData);
    router.refresh();
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

  const normalizedTarget = goal.target_value ?? 0;
  const normalizedCurrent = currentProgress;
  const progressTrackingEnabled = goal.target_value !== null || goal.current_value !== null;
  const effectiveTarget = normalizedTarget > 0 ? normalizedTarget : Math.max(10, normalizedCurrent, 1);
  const progressPercent = Math.min(100, Math.max(0, (normalizedCurrent / effectiveTarget) * 100));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={(e) => handleToggleComplete(e.target.checked)}
          disabled={isCompleting || isAddingProgress}
          aria-label={isCompleted ? "Mark goal as active" : "Mark goal as completed"}
          className="mt-1 h-5 w-5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`}>
            {goal.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-sm ${deadlineColor}`}>{deadlineText}</p>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isCompleted
                  ? "bg-green-100 text-green-700"
                  : goal.status === "paused"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {isCompleted ? "Completed" : goal.status || "Active"}
            </span>
          </div>
        </div>
      </div>

      {progressTrackingEnabled && (
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">Progress</span>
          {normalizedTarget > 0 ? (
            <span className="text-gray-600">
              {normalizedCurrent}/{normalizedTarget} {goal.target_unit ?? ""} ({Math.round(progressPercent)}%)
            </span>
          ) : (
            <span className="text-gray-500">
              Logged: {normalizedCurrent} {goal.target_unit ?? ""} (set target for exact %)
            </span>
          )}
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      )}

      {!isCompleted && progressTrackingEnabled && (
        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Add Progress</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={progressDelta}
              onChange={(e) => setProgressDelta(e.target.value)}
              placeholder={goal.target_unit ? `e.g. 1 ${goal.target_unit}` : "e.g. 1"}
              className="w-full px-2 py-2 border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={handleAddProgress}
            disabled={isAddingProgress}
            className="px-3 py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isAddingProgress ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {progressError && <p className="mb-4 text-sm text-red-600">{progressError}</p>}

      {/* AI Advice Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowAdvice(!showAdvice)}
          className="w-full text-left px-3 py-2 bg-gradient-to-r from-indigo-50 to-sky-50 rounded border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          {showAdvice ? "▼" : "▶"} AI Advice for this Goal
        </button>

        {showAdvice && (
          <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded text-sm text-gray-700 whitespace-pre-wrap">
            {goal.ai_advice ? (
              goal.ai_advice
            ) : (
              <div className="space-y-2">
                <span className="text-indigo-600 block">
                  No advice yet for this goal.
                </span>
                <form
                  action={async () => {
                    const fd = new FormData();
                    fd.append("goalId", goal.id);
                    fd.append("goalTitle", goal.title);
                    await getGoalAIAdviceAction(fd);
                  }}
                >
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded font-medium transition-colors"
                  >
                    Generate AI Advice
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="px-3 py-2 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
        >
          Delete
        </button>
      </div>

      <form ref={formRef} style={{ display: "none" }}>
        <input type="hidden" name="goalId" value={goal.id} />
      </form>
    </div>
  );
}

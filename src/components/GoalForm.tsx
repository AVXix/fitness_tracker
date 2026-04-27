"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addGoalAction } from "@/app/actions/goal-actions";

interface GoalFormProps {
  onGoalAdded?: () => void;
}

export function GoalForm({ onGoalAdded }: GoalFormProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [hasDeadline, setHasDeadline] = useState(true);
  const [enableProgressTracking, setEnableProgressTracking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current || isSubmitting) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(formRef.current);
      await addGoalAction(formData);
      formRef.current.reset();
      setShowForm(false);
      setHasDeadline(true);
      setEnableProgressTracking(true);
      onGoalAdded?.();
      router.refresh();
    } catch {
      setSubmitError("Could not create goal right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
      >
        + New Goal
      </button>
    );
  }

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Goal</h3>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}

        {/* Goal Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goal Title *
          </label>
          <input
            type="text"
            name="title"
            placeholder="e.g., Lose 10 lbs, Run a 5K, Bench Press 225 lbs"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            name="category"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fitness">Fitness</option>
            <option value="weight">Weight Loss</option>
            <option value="strength">Strength</option>
            <option value="endurance">Endurance</option>
            <option value="health">Health</option>
            <option value="flexibility">Flexibility</option>
          </select>
        </div>

        {/* Deadline Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="hasDeadline"
            checked={hasDeadline}
            onChange={(e) => setHasDeadline(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="hasDeadline" className="text-sm font-medium text-gray-700">
            Set a deadline?
          </label>
        </div>

        {/* Deadline Date */}
        {hasDeadline && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Date
            </label>
            <input
              type="date"
              name="targetDate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Progress Tracking Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enableProgressTracking"
            name="enableProgressTracking"
            checked={enableProgressTracking}
            onChange={(e) => setEnableProgressTracking(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="enableProgressTracking" className="text-sm font-medium text-gray-700">
            Enable progress bar tracking?
          </label>
        </div>

        {enableProgressTracking && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Value
              </label>
              <input
                type="number"
                name="targetValue"
                placeholder="e.g., 180"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting Progress
              </label>
              <input
                type="number"
                name="currentValue"
                placeholder="e.g., 0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <input
                type="text"
                name="targetUnit"
                placeholder="e.g., lbs, km, reps"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            placeholder="Add any additional notes about your goal..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Creating..." : "Create Goal"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              formRef.current?.reset();
              setEnableProgressTracking(true);
              setSubmitError(null);
            }}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

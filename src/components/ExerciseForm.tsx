"use client";

import { useState, type FormEvent } from "react";
import { addExerciseLogAction } from "@/app/actions/exercise-actions";

const WEIGHT_TRAIN_CATEGORIES = ["Upper Body", "Core", "Lower Body", "Full Body"];
const MUSCLE_GROUPS = {
  "Upper Body": [
    "Chest",
    "Back",
    "Shoulders",
    "Biceps",
    "Triceps",
    "Forearms",
  ],
  Core: ["Abs", "Obliques", "Lower Back"],
  "Lower Body": ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Adductors"],
  "Full Body": [
    "Chest",
    "Back",
    "Shoulders",
    "Legs",
    "Core",
  ],
};

const EXERCISES_BY_CATEGORY = {
  "Upper Body": [
    "Bench Press",
    "Pull-ups",
    "Dumbbell Rows",
    "Shoulder Press",
    "Lat Pulldowns",
    "Bicep Curls",
    "Tricep Dips",
  ],
  Core: ["Planks", "Crunches", "Russian Twists", "Leg Raises", "Deadlifts"],
  "Lower Body": [
    "Squats",
    "Leg Press",
    "Lunges",
    "Hamstring Curls",
    "Leg Extensions",
    "Calf Raises",
  ],
  "Full Body": ["Deadlifts", "Burpees", "Mountain Climbers", "Compound Moves"],
};

const CARDIO_EXERCISES = [
  "Running",
  "Treadmill",
  "Cycling",
  "Rowing",
  "Jump Rope",
  "Elliptical",
  "Swimming",
  "HIIT",
];

const CARDIO_INTENSITY = ["Low", "Moderate", "High"];

function getFormValue(form: HTMLFormElement, fieldName: string): string {
  const field = form.elements.namedItem(fieldName);

  if (!field || !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
    return "";
  }

  return field.value.trim();
}

export function ExerciseForm() {
  const [exerciseType, setExerciseType] = useState<"weight_train" | "cardio">(
    "weight_train"
  );
  const [category, setCategory] = useState<string>(WEIGHT_TRAIN_CATEGORIES[0]);
  const [muscleGroup, setMuscleGroup] = useState<string>(
    MUSCLE_GROUPS["Upper Body" as keyof typeof MUSCLE_GROUPS][0]
  );
  const [exerciseName, setExerciseName] = useState("");
  const [cardioIntensity, setCardioIntensity] = useState("Moderate");
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const formData = new FormData();
    formData.append("exerciseType", exerciseType);
    formData.append("exerciseName", exerciseName);
    formData.append("category", category);
    formData.append("workoutDate", workoutDate);

    // Add type-specific fields
    if (exerciseType === "weight_train") {
      formData.append("muscleGroup", muscleGroup);
      const sets = getFormValue(form, "sets");
      const reps = getFormValue(form, "reps");
      const weight = getFormValue(form, "weight");

      if (sets) formData.append("sets", sets);
      if (reps) formData.append("reps", reps);
      if (weight) formData.append("weight", weight);
    } else {
      formData.append("cardioIntensity", cardioIntensity);
      const duration = getFormValue(form, "duration");
      const distance = getFormValue(form, "distance");

      if (duration) formData.append("duration", duration);
      if (distance) formData.append("distance", distance);
    }

    await addExerciseLogAction(formData);
    setExerciseName("");
    form.reset();
  };

  const isWeightTrain = exerciseType === "weight_train";
  const availableExercises = isWeightTrain
    ? EXERCISES_BY_CATEGORY[category as keyof typeof EXERCISES_BY_CATEGORY] ||
      []
    : CARDIO_EXERCISES;

  const availableMuscleGroups = isWeightTrain
    ? MUSCLE_GROUPS[category as keyof typeof MUSCLE_GROUPS] || []
    : [];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-zinc-950">Log Exercise</h3>
      <p className="mt-1 text-sm text-zinc-600">
        Track your workout for today
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Date */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800">
            Workout Date
          </label>
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
          />
        </div>

        {/* Exercise Type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800">
            Exercise Type *
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setExerciseType("weight_train");
                setCategory(WEIGHT_TRAIN_CATEGORIES[0]);
                setMuscleGroup(MUSCLE_GROUPS["Upper Body"][0]);
              }}
              className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
                exerciseType === "weight_train"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Weight Train
            </button>
            <button
              type="button"
              onClick={() => {
                setExerciseType("cardio");
                setCategory("");
              }}
              className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
                exerciseType === "cardio"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Cardio
            </button>
          </div>
        </div>

        {/* Weight Train Category */}
        {isWeightTrain && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Training Focus
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setMuscleGroup(
                  MUSCLE_GROUPS[
                    e.target.value as keyof typeof MUSCLE_GROUPS
                  ][0]
                );
              }}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
            >
              {WEIGHT_TRAIN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Muscle Group */}
        {isWeightTrain && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Muscle Group *
            </label>
            <select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
              required
            >
              {availableMuscleGroups.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {muscle}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cardio Intensity */}
        {!isWeightTrain && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Intensity Level
            </label>
            <div className="flex gap-2">
              {CARDIO_INTENSITY.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setCardioIntensity(level)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    cardioIntensity === level
                      ? level === "Low"
                        ? "bg-blue-600 text-white"
                        : level === "Moderate"
                        ? "bg-yellow-600 text-white"
                        : "bg-red-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-800">
            Exercise Name *
          </label>
          <select
            name="exerciseName"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
          >
            <option value="">
              {isWeightTrain
                ? "Select an exercise..."
                : "Select cardio type..."}
            </option>
            {availableExercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>

        {/* Weight Train Specific Fields */}
        {isWeightTrain && (
          <>
            <div className="grid gap-3 grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Sets
                </label>
                <input
                  type="number"
                  name="sets"
                  min="1"
                  placeholder="4"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Reps
                </label>
                <input
                  type="number"
                  name="reps"
                  min="1"
                  max="50"
                  placeholder="10"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.5"
                  placeholder="20"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
            </div>
          </>
        )}

        {/* Cardio Specific Fields */}
        {!isWeightTrain && (
          <>
            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration"
                  min="1"
                  placeholder="30"
                  required
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-800">
                  Distance (km)
                </label>
                <input
                  type="number"
                  name="distance"
                  min="0"
                  step="0.1"
                  placeholder="5"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-white font-medium hover:bg-zinc-800"
        >
          Log Exercise
        </button>
      </form>
    </div>
  );
}

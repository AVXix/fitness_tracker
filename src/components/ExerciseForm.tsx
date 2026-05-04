"use client";

import { useEffect, useState, type FormEvent } from "react";
import { addExerciseLogAction } from "@/app/actions/exercise-actions";

const WEIGHT_TRAIN_CATEGORIES = ["Upper Body", "Core", "Lower Body", "Full Body"];
const MUSCLE_GROUPS_BY_CATEGORY: Record<string, string[]> = {
  "Upper Body": [
    "Pecs",
    "Lats",
    "Rhomboids",
    "Traps",
    "Rear Delts",
    "Side Delts",
    "Front Delts",
    "Biceps",
    "Triceps",
    "Forearms",
  ],
  "Core": [
    "Abs",
    "Obliques",
    "Transverse Abdominis",
    "Lower Back",
  ],
  "Lower Body": [
    "Quads",
    "Hamstrings",
    "Glutes",
    "Calves",
    "Adductors",
    "Abductors",
  ],
  // Keep Full Body explicit and small to avoid over-generalising — use "Compound"
  "Full Body": [
    "Compound",
  ],
};

const EXERCISES_BY_CATEGORY: Record<string, string[]> = {
  "Upper Body": [
    "Bench Press",
    "Incline Bench Press",
    "Chest Fly",
    "Pull-ups",
    "Dumbbell Rows",
    "Seated Cable Row",
    "Face Pull",
    "Shoulder Press",
    "Lateral Raises",
    "Rear Delt Fly",
    "Lat Pulldowns",
    "Bicep Curls",
    "Hammer Curls",
    "Tricep Dips",
    "Overhead Tricep Extension",
  ],
  "Core": ["Planks", "Crunches", "Cable Crunches", "Russian Twists", "Leg Raises", "Hanging Knee Raises", "Pallof Press", "Back Extensions"],
  "Lower Body": [
    "Squats",
    "Front Squats",
    "Leg Press",
    "Lunges",
    "Bulgarian Split Squats",
    "Step-Ups",
    "Romanian Deadlifts",
    "Hip Thrusts",
    "Hamstring Curls",
    "Leg Extensions",
    "Calf Raises",
    "Standing Calf Raises",
  ],
  "Full Body": [
    "Deadlifts",
    "Kettlebell Swings",
    "Burpees",
    "Mountain Climbers",
    "Thrusters",
    "Clean and Press",
    "Compound Moves",
  ],
};

// Mapping each exercise to the muscle groups it targets.
// The filter below requires every selected muscle group to be present.
const EXERCISE_TARGETS: Record<string, string[]> = {
  // Upper Body
  "Bench Press": ["Pecs", "Front Delts", "Triceps"],
  "Incline Bench Press": ["Pecs", "Front Delts", "Triceps"],
  "Chest Fly": ["Pecs", "Front Delts"],
  "Pull-ups": ["Lats", "Rhomboids", "Traps", "Biceps"],
  "Dumbbell Rows": ["Rhomboids", "Lats", "Rear Delts", "Biceps"],
  "Seated Cable Row": ["Rhomboids", "Lats", "Rear Delts", "Biceps"],
  "Face Pull": ["Rear Delts", "Rhomboids", "Traps"],
  "Shoulder Press": ["Front Delts", "Side Delts", "Triceps"],
  "Lateral Raises": ["Side Delts"],
  "Rear Delt Fly": ["Rear Delts", "Rhomboids"],
  "Lat Pulldowns": ["Lats", "Rhomboids", "Biceps"],
  "Bicep Curls": ["Biceps", "Forearms"],
  "Hammer Curls": ["Biceps", "Forearms"],
  "Tricep Dips": ["Triceps", "Pecs", "Front Delts"],
  "Overhead Tricep Extension": ["Triceps"],
  // Core
  "Planks": ["Transverse Abdominis", "Abs", "Obliques"],
  "Crunches": ["Abs"],
  "Cable Crunches": ["Abs", "Transverse Abdominis"],
  "Russian Twists": ["Obliques", "Transverse Abdominis"],
  "Leg Raises": ["Abs", "Transverse Abdominis"],
  "Hanging Knee Raises": ["Abs", "Transverse Abdominis"],
  "Pallof Press": ["Transverse Abdominis", "Obliques"],
  "Back Extensions": ["Lower Back", "Glutes", "Hamstrings"],
  // Lower Body
  "Squats": ["Quads", "Glutes", "Adductors"],
  "Front Squats": ["Quads", "Glutes", "Core"],
  "Leg Press": ["Quads", "Glutes", "Adductors"],
  "Lunges": ["Quads", "Glutes", "Hamstrings", "Adductors"],
  "Bulgarian Split Squats": ["Quads", "Glutes", "Hamstrings"],
  "Step-Ups": ["Quads", "Glutes"],
  "Romanian Deadlifts": ["Hamstrings", "Glutes", "Lower Back"],
  "Hip Thrusts": ["Glutes", "Hamstrings"],
  "Hamstring Curls": ["Hamstrings"],
  "Leg Extensions": ["Quads"],
  "Calf Raises": ["Calves"],
  "Standing Calf Raises": ["Calves"],
  // Full Body / Compound
  "Deadlifts": ["Rhomboids", "Traps", "Glutes", "Hamstrings", "Lower Back"],
  "Kettlebell Swings": ["Glutes", "Hamstrings", "Core", "Lower Back"],
  "Burpees": ["Compound"],
  "Mountain Climbers": ["Compound", "Core"],
  "Thrusters": ["Quads", "Glutes", "Front Delts", "Side Delts", "Triceps", "Core"],
  "Clean and Press": ["Glutes", "Hamstrings", "Traps", "Front Delts", "Side Delts", "Triceps", "Core"],
  "Compound Moves": ["Compound"],
  // Cardio (for reference)
  "Running": ["Cardio"],
  "Treadmill": ["Cardio"],
  "Cycling": ["Cardio"],
  "Rowing": ["Cardio"],
  "Jump Rope": ["Cardio"],
  "Elliptical": ["Cardio"],
  "Swimming": ["Cardio"],
  "HIIT": ["Cardio"],
};

const EXERCISE_LOAD_TYPES: Record<string, "weight" | "optional" | "bodyweight"> = {
  "Bench Press": "weight",
  "Incline Bench Press": "weight",
  "Chest Fly": "weight",
  "Pull-ups": "bodyweight",
  "Dumbbell Rows": "weight",
  "Seated Cable Row": "weight",
  "Face Pull": "weight",
  "Shoulder Press": "weight",
  "Lateral Raises": "weight",
  "Rear Delt Fly": "weight",
  "Lat Pulldowns": "weight",
  "Bicep Curls": "weight",
  "Hammer Curls": "weight",
  "Tricep Dips": "bodyweight",
  "Overhead Tricep Extension": "weight",
  "Planks": "bodyweight",
  "Crunches": "bodyweight",
  "Cable Crunches": "weight",
  "Russian Twists": "bodyweight",
  "Leg Raises": "bodyweight",
  "Hanging Knee Raises": "bodyweight",
  "Pallof Press": "weight",
  "Back Extensions": "bodyweight",
  "Squats": "optional",
  "Front Squats": "weight",
  "Leg Press": "weight",
  "Lunges": "optional",
  "Bulgarian Split Squats": "optional",
  "Step-Ups": "optional",
  "Romanian Deadlifts": "weight",
  "Hip Thrusts": "weight",
  "Hamstring Curls": "weight",
  "Leg Extensions": "weight",
  "Calf Raises": "weight",
  "Standing Calf Raises": "weight",
  "Deadlifts": "weight",
  "Kettlebell Swings": "weight",
  "Burpees": "bodyweight",
  "Mountain Climbers": "bodyweight",
  "Thrusters": "weight",
  "Clean and Press": "weight",
  "Compound Moves": "bodyweight",
};

const CARDIO_EXERCISES = [
  "Walking",
  "Easy Cycling",
  "Running",
  "Cycling",
  "Rowing",
  "Jump Rope",
  "Elliptical",
  "Swimming",
  "HIIT",
];

const CARDIO_EXERCISES_BY_INTENSITY: Record<string, string[]> = {
  Low: ["Walking", "Easy Cycling", "Elliptical"],
  Moderate: ["Running", "Cycling", "Swimming", "Rowing", "Elliptical"],
  High: ["Running", "Rowing", "Jump Rope", "HIIT"],
};

const CARDIO_INTENSITY_LEVELS = ["Low", "Moderate", "High"] as const;

const CARDIO_DISTANCE_BY_EXERCISE: Record<
  string,
  { label: string; placeholder: string }
> = {
  Walking: { label: "Distance (km)", placeholder: "3" },
  "Easy Cycling": { label: "Distance (km)", placeholder: "5" },
  Running: { label: "Distance (km)", placeholder: "5" },
  Treadmill: { label: "Distance (km)", placeholder: "5" },
  Cycling: { label: "Distance (km)", placeholder: "10" },
  Rowing: { label: "Distance (m)", placeholder: "2000" },
};

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
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>(
    []
  );
  const [exerciseName, setExerciseName] = useState("");
  const [cardioIntensity, setCardioIntensity] = useState("Moderate");
  const [workoutDate, setWorkoutDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (exerciseType !== "cardio" || !exerciseName) {
      return;
    }

    const availableExercises = CARDIO_EXERCISES_BY_INTENSITY[cardioIntensity] ?? CARDIO_EXERCISES;
    if (!availableExercises.includes(exerciseName)) {
      setExerciseName("");
    }
  }, [cardioIntensity, exerciseName, exerciseType]);

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
      // submit selected muscle groups as a comma-separated string
      formData.append("muscleGroup", (selectedMuscleGroups || []).join(", "));
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
    ? EXERCISES_BY_CATEGORY[category] || []
    : CARDIO_EXERCISES_BY_INTENSITY[cardioIntensity] || CARDIO_EXERCISES;

  const availableMuscleGroups = isWeightTrain
    ? MUSCLE_GROUPS_BY_CATEGORY[category] || []
    : [];

  const selectedExerciseLoadType = exerciseName
    ? EXERCISE_LOAD_TYPES[exerciseName] ?? "weight"
    : "weight";
  const shouldShowWeightField = isWeightTrain && selectedExerciseLoadType !== "bodyweight";
  const selectedCardioDistance = exerciseName && CARDIO_DISTANCE_BY_EXERCISE[exerciseName]
    ? {
        label: CARDIO_DISTANCE_BY_EXERCISE[exerciseName].label,
        placeholder: CARDIO_DISTANCE_BY_EXERCISE[exerciseName].placeholder,
      }
    : null;
  const cardioUsesDurationOnly = exerciseType === "cardio" && !selectedCardioDistance;

  // Filter exercises by selected muscle groups when any are chosen.
  // Exercise shows only if it targets ALL selected muscle groups (AND logic).
  const filteredExercises = (availableExercises || []).filter((ex) => {
    if (selectedMuscleGroups.length === 0) return true;
    const mapped = EXERCISE_TARGETS[ex] || [];
    return selectedMuscleGroups.every((m) => mapped.includes(m));
  });

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
                setSelectedMuscleGroups([]);
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
                setSelectedMuscleGroups([]);
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
                // clear any previous muscle selections when changing the category
                setSelectedMuscleGroups([]);
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

        {/* Muscle Group (multi-select) */}
        {isWeightTrain && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Target Muscles (select one or more)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMuscleGroups.map((muscle) => {
                const selected = selectedMuscleGroups.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => {
                      setSelectedMuscleGroups((prev) =>
                        prev.includes(muscle)
                          ? prev.filter((p) => p !== muscle)
                          : [...prev, muscle]
                      );
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors border ${
                      selected
                        ? "bg-blue-600 text-white border-transparent"
                        : "bg-gray-100 text-zinc-800 border-zinc-200 hover:bg-gray-200"
                    }`}
                  >
                    {muscle}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-sm text-zinc-600">
              {selectedMuscleGroups.length === 0
                ? "Showing all exercises"
                : `Filtering by: ${selectedMuscleGroups.join(", ")}`}
            </div>
          </div>
        )}

        {/* Cardio Intensity */}
        {!isWeightTrain && (
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800">
              Intensity Level{exerciseName ? ` for ${exerciseName}` : ""}
            </label>
            <div className="flex gap-2">
              {CARDIO_INTENSITY_LEVELS.map((level) => (
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
              {isWeightTrain ? "Select an exercise..." : "Select cardio type..."}
            </option>
            {filteredExercises.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>

        {/* Weight Train Specific Fields */}
        {shouldShowWeightField && (
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
                  {selectedExerciseLoadType === "optional"
                    ? "Weight / Load (kg)"
                    : "Weight (kg)"}
                </label>
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.5"
                  placeholder={selectedExerciseLoadType === "optional" ? "Optional" : "20"}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                />
              </div>
            </div>
            {selectedExerciseLoadType === "optional" && (
              <p className="text-sm text-zinc-500">
                This exercise can be done with bodyweight or added load.
              </p>
            )}
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
              {selectedCardioDistance ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800">
                    {selectedCardioDistance.label}
                  </label>
                  <input
                    type="number"
                    name="distance"
                    min="0"
                    step={selectedCardioDistance.label.includes("m") ? "10" : "0.1"}
                    placeholder={selectedCardioDistance.placeholder}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                  />
                </div>
              ) : cardioUsesDurationOnly ? (
                <div className="col-span-1 flex items-end">
                  <p className="text-sm text-zinc-500">
                    This exercise is tracked by duration only.
                  </p>
                </div>
              ) : null}
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

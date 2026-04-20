"use client";

import { useMemo, useState } from "react";
import type { FitnessDashboardData } from "@/lib/fitness";

interface WeightTrackerProps {
  data: FitnessDashboardData;
}

export function WeightTracker({ data }: WeightTrackerProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseDateKey = (key: string) => new Date(`${key}T00:00:00`);

  const currentWeight = data.weightLogs[0]?.weight_kg;
  const previousWeight = data.weightLogs[1]?.weight_kg;
  const weightChange = currentWeight && previousWeight ? currentWeight - previousWeight : null;
  const changePercent = weightChange && previousWeight ? (weightChange / previousWeight) * 100 : null;

  // Calculate stats
  const allWeights = data.weightLogs.map((w) => w.weight_kg);
  const minWeight = allWeights.length > 0 ? Math.min(...allWeights) : null;
  const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : null;

  const weightByDate = useMemo(() => {
    const map = new Map<string, number>();

    for (const log of data.weightLogs) {
      const key = log.logged_on || log.log_date;
      if (!key) {
        continue;
      }

      // Keep the first item encountered, as list is sorted newest-first.
      if (!map.has(key)) {
        map.set(key, log.weight_kg);
      }
    }

    return map;
  }, [data.weightLogs]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedWeight = weightByDate.get(selectedKey);

  const rollingAverage = (days: number) => {
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const entries = Array.from(weightByDate.entries()).filter(([dateKey]) => {
      const date = parseDateKey(dateKey);
      return date >= start && date <= end;
    });

    if (entries.length === 0) {
      return null;
    }

    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    return total / entries.length;
  };

  const weeklyAverage = rollingAverage(7);
  const monthlyAverage = rollingAverage(30);

  const daysInVisibleMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay();
  const calendarCells: Array<Date | null> = [];

  for (let i = 0; i < firstDayOfMonth; i += 1) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInVisibleMonth; day += 1) {
    calendarCells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Current Weight</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {currentWeight ? `${currentWeight.toFixed(1)} kg` : "—"}
          </p>
          {weightChange && (
            <p
              className={`mt-2 text-sm font-medium ${
                weightChange > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg
              {changePercent && ` (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Lowest Weight</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {minWeight ? `${minWeight.toFixed(1)} kg` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Highest Weight</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">
            {maxWeight ? `${maxWeight.toFixed(1)} kg` : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-zinc-600">Total Logs</p>
          <p className="mt-2 text-3xl font-bold text-zinc-950">{data.weightLogs.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-950">Weight Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                )
              }
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Prev
            </button>
            <p className="min-w-32 text-center text-sm font-medium text-zinc-900">
              {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                )
              }
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase text-zinc-500">
          {"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <div key={`empty-${idx}`} className="min-h-20 rounded-lg border border-transparent" />;
            }

            const key = formatDateKey(cell);
            const dayWeight = weightByDate.get(key);
            const isSelected = key === selectedKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(cell)}
                className={`min-h-20 rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : dayWeight !== undefined
                      ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-zinc-900"}`}>
                  {cell.getDate()}
                </p>
                <p className={`mt-1 text-xs ${isSelected ? "text-zinc-100" : "text-zinc-600"}`}>
                  {dayWeight !== undefined ? `${dayWeight.toFixed(1)} kg` : "-"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {data.weightLogs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">Selected Day</p>
            <p className="mt-2 text-3xl font-bold text-zinc-950">
              {selectedWeight !== undefined ? `${selectedWeight.toFixed(1)} kg` : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{selectedDate.toLocaleDateString()}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">7-Day Average</p>
            <p className="mt-2 text-3xl font-bold text-zinc-950">
              {weeklyAverage !== null ? `${weeklyAverage.toFixed(1)} kg` : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">logged days</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">30-Day Average</p>
            <p className="mt-2 text-3xl font-bold text-zinc-950">
              {monthlyAverage !== null ? `${monthlyAverage.toFixed(1)} kg` : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">logged days</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase text-zinc-700">Recent Weight Entries</h3>
        {data.weightLogs.length > 0 ? (
          <div className="mt-4 space-y-3">
            {data.weightLogs.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 p-3"
              >
                <p className="text-sm text-zinc-600">
                  {new Date(log.logged_on || log.log_date || "").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm font-semibold text-zinc-950">{log.weight_kg.toFixed(1)} kg</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">No weight logs yet. Start by logging your weight.</p>
        )}
      </div>
    </div>
  );
}

// Backward-compatible alias while imports transition to WeightTracker.
export const WeightTrackerDisplay = WeightTracker;

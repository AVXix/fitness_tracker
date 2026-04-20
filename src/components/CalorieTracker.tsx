"use client";

import { useMemo, useState } from "react";
import type { FitnessDashboardData } from "@/lib/fitness";

interface CalorieTrackerProps {
  data: FitnessDashboardData;
}

export function CalorieTracker({ data }: CalorieTrackerProps) {
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

  // Group calorie logs by date
  const logsByDate = data.calorieLogs.reduce(
    (acc, log) => {
      const date = log.logged_on;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    },
    {} as Record<string, typeof data.calorieLogs>
  );

  // Calculate totals for each date
  const dailyTotals = Object.entries(logsByDate).map(([date, logs]) => {
    const totalCalories = logs.reduce((sum, log) => sum + log.calories, 0);
    const totalProtein = logs.reduce((sum, log) => sum + (log.protein_g || 0), 0);
    const totalCarbs = logs.reduce((sum, log) => sum + (log.carbs_g || 0), 0);
    const totalFat = logs.reduce((sum, log) => sum + (log.fat_g || 0), 0);

    return { date, totalCalories, totalProtein, totalCarbs, totalFat };
  });

  // Sort by most recent first
  dailyTotals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const dailyTotalsMap = useMemo(() => {
    const map = new Map<string, (typeof dailyTotals)[number]>();
    for (const day of dailyTotals) {
      map.set(day.date, day);
    }
    return map;
  }, [dailyTotals]);

  const selectedKey = formatDateKey(selectedDate);
  const selectedDay = dailyTotalsMap.get(selectedKey);

  const rollingAverage = (days: number) => {
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const entries = dailyTotals.filter((entry) => {
      const date = parseDateKey(entry.date);
      return date >= start && date <= end;
    });

    if (entries.length === 0) {
      return 0;
    }

    const total = entries.reduce((sum, entry) => sum + entry.totalCalories, 0);
    return Math.round(total / entries.length);
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

  const overallTotalCalories = data.calorieLogs.reduce((sum, log) => sum + log.calories, 0);
  const avgDailyCalories = dailyTotals.length > 0 ? Math.round(overallTotalCalories / dailyTotals.length) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-950">Calorie Calendar</h2>
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
            const dayData = dailyTotalsMap.get(key);
            const isSelected = key === selectedKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(cell)}
                className={`min-h-20 rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : dayData
                      ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-zinc-900"}`}>
                  {cell.getDate()}
                </p>
                <p className={`mt-1 text-xs ${isSelected ? "text-zinc-100" : "text-zinc-600"}`}>
                  {dayData ? `${dayData.totalCalories} kcal` : "-"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {dailyTotals.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">Selected Day</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">
                {selectedDay ? selectedDay.totalCalories.toLocaleString() : "-"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">kcal on {selectedDate.toLocaleDateString()}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">7-Day Average</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{weeklyAverage.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-500">kcal (logged days)</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">30-Day Average</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{monthlyAverage.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-500">kcal (logged days)</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">Days Tracked</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{dailyTotals.length}</p>
              <p className="mt-1 text-xs text-zinc-500">days with logs</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-zinc-700">Selected Day Macros</h3>
            {selectedDay ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase text-zinc-500">Protein</p>
                  <p className="mt-1 text-xl font-semibold text-blue-600">{selectedDay.totalProtein.toFixed(1)} g</p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase text-zinc-500">Carbs</p>
                  <p className="mt-1 text-xl font-semibold text-orange-600">{selectedDay.totalCarbs.toFixed(1)} g</p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4">
                  <p className="text-xs uppercase text-zinc-500">Fat</p>
                  <p className="mt-1 text-xl font-semibold text-yellow-600">{selectedDay.totalFat.toFixed(1)} g</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">No calorie logs on this day yet.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">Overall Daily Average</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{avgDailyCalories.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-500">calories per logged day</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-zinc-600">Total Logged</p>
              <p className="mt-2 text-3xl font-bold text-zinc-950">{overallTotalCalories.toLocaleString()}</p>
              <p className="mt-1 text-xs text-zinc-500">{data.calorieLogs.length} entries</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-600">No calorie logs yet. Start by logging a meal.</p>
        </div>
      )}
    </div>
  );
}

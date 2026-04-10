import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const isConfigured = hasSupabaseEnv();
  const userName = user?.user_metadata.name ?? "there";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#ecfeff_100%)] p-8 shadow-sm md:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              Fitness Tracker
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
              Track workouts, body progress, and goals in one simple place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
              Build consistent habits with a personal dashboard for weight logs, workout
              sessions, and fitness targets. Your data stays tied to your own account.
            </p>

            {!isConfigured ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your
                `.env` file to enable authentication.
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <>
                  <Link href="/profile" className="rounded-xl bg-zinc-950 px-5 py-3 text-white">
                    Open My Dashboard
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-zinc-900"
                    >
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/register" className="rounded-xl bg-zinc-950 px-5 py-3 text-white">
                    Create Free Account
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-zinc-900"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>

            <div className="mt-8 text-sm text-zinc-600">
              {user ? `Welcome back, ${userName}.` : "Start with your first goal and first workout log."}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-zinc-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">This week</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950">Your fitness snapshot</p>
              </div>
              <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Personal
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-orange-50 p-4">
                <p className="text-sm text-orange-700">Workouts</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">3</p>
                <p className="mt-1 text-xs text-zinc-500">Keep your streak going</p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-4">
                <p className="text-sm text-cyan-700">Goals</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">2</p>
                <p className="mt-1 text-xs text-zinc-500">Weight, strength, cardio</p>
              </div>
              <div className="rounded-2xl bg-lime-50 p-4">
                <p className="text-sm text-lime-700">Progress</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">+1</p>
                <p className="mt-1 text-xs text-zinc-500">New log this week</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm font-medium text-zinc-700">What you can track</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-600">
                <span className="rounded-full bg-white px-3 py-1">Profile</span>
                <span className="rounded-full bg-white px-3 py-1">Goals</span>
                <span className="rounded-full bg-white px-3 py-1">Weight logs</span>
                <span className="rounded-full bg-white px-3 py-1">Workouts</span>
                <span className="rounded-full bg-white px-3 py-1">Exercises</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Set clear goals</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Add weight, strength, or cardio goals and keep them attached to your own account.
          </p>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Log every workout</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Save sessions with duration, calories, and notes so your routine becomes easier to review.
          </p>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Track progress</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Record weight changes over time and build a dashboard that actually reflects your progress.
          </p>
        </article>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Add your Supabase environment variables before logging in.");
        return;
      }

      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");

      if (!email || !password) {
        setError("Email and password are required.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/profile");
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Welcome back</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Log in with your Supabase account to continue building your fitness tracker.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form action={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-800">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-900"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-800">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-900"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPending ? "Please wait..." : "Log in"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        Need an account?{" "}
        <Link href="/register" className="font-medium text-zinc-950 underline underline-offset-4">
          Create one
        </Link>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      setMessage(null);

      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setError("Add your Supabase environment variables before signing up.");
        return;
      }

      const name = String(formData.get("name") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");

      if (!name || !email || !password) {
        setError("Name, email, and password are required.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/profile");
        router.refresh();
        return;
      }

      setMessage("Account created. Check your email to confirm your account, then log in.");
    });
  }

  return (
    <div className="w-full rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign up with Supabase so each user can have their own tracker data.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <form action={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-800">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 outline-none transition focus:border-zinc-900"
          />
        </div>

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
            autoComplete="new-password"
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
          {isPending ? "Please wait..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-950 underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}

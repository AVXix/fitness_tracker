import { ReactNode } from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Login required
          </h1>
          <p className="mt-3 text-zinc-600">
            Sign in to access the fitness tracker.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/login" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-white">
              Login
            </Link>
            <Link href="/" className="rounded-xl border border-zinc-300 px-4 py-2.5 text-zinc-900">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-64 flex-1 bg-zinc-50 px-6 py-10">
        {children}
      </main>
    </div>
  );
}

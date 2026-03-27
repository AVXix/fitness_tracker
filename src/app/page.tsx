import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-4xl font-semibold">Fitness Tracker</h1>
      <p className="mt-3 max-w-xl text-zinc-600">
        Full-featured fitness tracker with user management, profile management, and a
        community forum.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <>
            <Link href="/profile" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
              Open Profile
            </Link>
            <Link href="/forum" className="rounded-md border border-zinc-300 px-4 py-2">
              Open Forum
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2">
                Logout
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/register" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
              Register
            </Link>
            <Link href="/login" className="rounded-md border border-zinc-300 px-4 py-2">
              Login
            </Link>
          </>
        )}
      </div>

      <div className="mt-10 rounded-xl border border-zinc-200 p-5 text-sm text-zinc-700">
        <p>Current user: {user ? `${user.name} (${user.email})` : "Not logged in"}</p>
      </div>
    </main>
  );
}

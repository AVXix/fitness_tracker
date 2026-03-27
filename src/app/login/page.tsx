import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticateUser, startSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function loginAction(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !password) {
      redirect("/login?error=Email%20and%20password%20are%20required");
    }

    const result = await authenticateUser({ email, password });
    if (!result.ok) {
      redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }

    await startSession(result.user.id);
    redirect("/profile");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-zinc-600">Log in to manage your profile and forum posts.</p>

      {params.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

        <button type="submit" className="w-full rounded-md bg-zinc-900 px-4 py-2 text-white">
          Log in
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        Need an account? <Link href="/register" className="font-medium text-zinc-900">Register</Link>
      </p>
    </main>
  );
}

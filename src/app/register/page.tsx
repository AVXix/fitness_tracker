import Link from "next/link";
import { redirect } from "next/navigation";
import { registerUser, startSession } from "@/lib/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function registerAction(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();

    if (!name || !email || !password) {
      redirect("/register?error=All%20fields%20are%20required");
    }

    if (password.length < 6) {
      redirect("/register?error=Password%20must%20be%20at%20least%206%20characters");
    }

    const result = await registerUser({ name, email, password });
    if (!result.ok) {
      redirect(`/register?error=${encodeURIComponent(result.error)}`);
    }

    await startSession(result.user.id);
    redirect("/profile");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-zinc-600">Register to use your fitness tracker app.</p>

      {params.error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <form action={registerAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
        </div>

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
          Register
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-600">
        Already have an account? <Link href="/login" className="font-medium text-zinc-900">Log in</Link>
      </p>
    </main>
  );
}

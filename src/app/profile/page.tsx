import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  async function updateProfileAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();

    const name = String(formData.get("name") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const goal = String(formData.get("goal") ?? "").trim();

    if (!name) {
      redirect("/profile?error=Name%20is%20required");
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name,
        bio: bio || null,
        goal: goal || null,
      },
    });

    revalidatePath("/profile");
    redirect("/profile?success=1");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">User Profile</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/forum" className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
            Go to Forum
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white">
              Logout
            </button>
          </form>
        </div>
      </header>

      {params.success ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Profile updated successfully.
        </p>
      ) : null}

      {params.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <dl className="mb-6 grid gap-2 text-sm text-zinc-700">
          <div>
            <dt className="font-medium">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="font-medium">Role</dt>
            <dd>{user.role}</dd>
          </div>
        </dl>

        <form action={updateProfileAction} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-1 block text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={user.bio ?? ""}
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="goal" className="mb-1 block text-sm font-medium">
              Fitness Goal
            </label>
            <input
              id="goal"
              name="goal"
              defaultValue={user.goal ?? ""}
              className="w-full rounded-md border border-zinc-300 px-3 py-2"
            />
          </div>

          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
            Save Changes
          </button>
        </form>
      </section>
    </main>
  );
}

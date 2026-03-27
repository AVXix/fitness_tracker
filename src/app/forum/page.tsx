import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const posts = await prisma.forumPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, name: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  async function createPostAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!title || !content) {
      redirect("/forum?error=Title%20and%20content%20are%20required");
    }

    await prisma.forumPost.create({
      data: {
        title,
        content,
        authorId: currentUser.id,
      },
    });

    revalidatePath("/forum");
  }

  async function createCommentAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();

    const postId = String(formData.get("postId") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!postId || !content) {
      redirect("/forum?error=Comment%20cannot%20be%20empty");
    }

    const postExists = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!postExists) {
      redirect("/forum?error=Post%20not%20found");
    }

    await prisma.forumComment.create({
      data: {
        postId,
        content,
        authorId: currentUser.id,
      },
    });

    revalidatePath("/forum");
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Fitness Forum</h1>
          <p className="mt-1 text-sm text-zinc-600">Ask and comment on fitness-related topics.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile" className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
            Back to Profile
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white">
              Logout
            </button>
          </form>
        </div>
      </header>

      {params.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </p>
      ) : null}

      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Create a post</h2>
        <form action={createPostAction} className="mt-4 space-y-3">
          <input
            name="title"
            placeholder="Post title"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
          <textarea
            name="content"
            placeholder="Share your question or tip"
            rows={3}
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2"
          />
          <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-white">
            Publish Post
          </button>
        </form>
      </section>

      <section className="space-y-5">
        {posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600">
            No posts yet. Create the first post.
          </p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">{post.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-zinc-700">{post.content}</p>
              <p className="mt-2 text-xs text-zinc-500">By {post.author.name}</p>

              <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
                <h4 className="text-sm font-semibold">Comments ({post.comments.length})</h4>
                {post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-zinc-50 p-3 text-sm">
                    <p>{comment.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">{comment.author.name}</p>
                  </div>
                ))}

                <form action={createCommentAction} className="space-y-2">
                  <input type="hidden" name="postId" value={post.id} />
                  <textarea
                    name="content"
                    placeholder="Write a comment"
                    rows={2}
                    required
                    className="w-full rounded-md border border-zinc-300 px-3 py-2"
                  />
                  <button type="submit" className="rounded-md border border-zinc-300 px-3 py-2 text-sm">
                    Add Comment
                  </button>
                </form>
              </div>
            </article>
          ))
        )}
      </section>

      <p className="mt-8 text-sm text-zinc-600">Logged in as {user.name}</p>
    </main>
  );
}

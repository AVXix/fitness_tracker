import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createForumCommentAction,
  deleteForumCommentAction,
  deleteForumPostAction,
  voteForumPostAction,
} from "@/app/fitness-actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureForumSchema } from "@/lib/supabase/ensure-schema";

export const dynamic = "force-dynamic";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  posted_by?: string | null;
}

interface ForumComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  commente_by?: string | null;
  commented_by?: string | null;
}

interface ProfileTrainerRow {
  id: string;
  is_trainer: boolean | null;
}

export default async function ForumPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ voteError?: string | string[] }> | { voteError?: string | string[] };
}) {
  const { postId } = await params;
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const voteErrorValue = resolvedSearchParams.voteError;
  const voteError = Array.isArray(voteErrorValue) ? voteErrorValue[0] : voteErrorValue;
  const user = await getCurrentUser();
  if (user) {
    await ensureForumSchema();
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, title, content, created_at, user_id, posted_by")
    .eq("id", postId)
    .maybeSingle<ForumPost>();

  if (!post) {
    notFound();
  }

  const { data: commentsWithCommenteBy, error: commentsWithCommenteByError } = await supabase
    .from("forum_comments")
    .select("id, post_id, user_id, content, created_at, commente_by")
    .eq("post_id", post.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const { data: commentsWithCommentedBy } =
    commentsWithCommenteByError && isMissingCommenterColumnError(commentsWithCommenteByError.message)
      ? await supabase
          .from("forum_comments")
          .select("id, post_id, user_id, content, created_at, commented_by")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true })
          .limit(200)
      : { data: null };

  const { data: commentsWithoutName } =
    commentsWithCommenteByError && isMissingCommenterColumnError(commentsWithCommenteByError.message)
      ? await supabase
          .from("forum_comments")
          .select("id, post_id, user_id, content, created_at")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true })
          .limit(200)
      : { data: null };

  const comments: ForumComment[] = ((commentsWithCommenteBy || commentsWithCommentedBy || commentsWithoutName || []) as ForumComment[]).map(
    (comment) => ({
      ...comment,
      commente_by: comment.commente_by ?? null,
      commented_by: comment.commented_by ?? null,
    }),
  );

  const profileIds = [...new Set([post.user_id, ...comments.map((comment) => comment.user_id)])];
  const { data: trainerRows } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, is_trainer")
        .in("id", profileIds)
    : { data: null };

  const trainerIds = new Set<string>();
  for (const row of (trainerRows || []) as ProfileTrainerRow[]) {
    if (row.is_trainer) {
      trainerIds.add(row.id);
    }
  }

  const { data: postVotes } = await supabase
    .from("forum_votes")
    .select("vote_type")
    .eq("post_id", post.id);

  const upvotes = (postVotes || []).filter((vote) => vote.vote_type === "upvote").length;
  const downvotes = (postVotes || []).filter((vote) => vote.vote_type === "downvote").length;
  const netVotes = upvotes - downvotes;
  const returnPath = `/forum/${post.id}`;
  const postAuthorLabel = formatUserLabel(
    post.user_id,
    user?.id,
    post.posted_by?.trim() || undefined,
    trainerIds.has(post.user_id),
  );

  return (
    <div className="space-y-6">
      {voteError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Vote failed: {voteError}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/forum" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Back to forum
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{post.title}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Posted {getTimeAgo(new Date(post.created_at))} by {postAuthorLabel}
          </p>
        </div>
        {user?.id === post.user_id ? (
          <form action={deleteForumPostAction}>
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="returnPath" value="/forum" />
            <button
              type="submit"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Delete Post
            </button>
          </form>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="voteType" value="upvote" />
              <input type="hidden" name="returnPath" value={returnPath} />
              <PendingSubmitButton
                className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-orange-100 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                pendingLabel="..."
                disabled={!user}
              >
                ▲
              </PendingSubmitButton>
            </form>

            <span className="min-w-[2rem] text-center text-sm font-semibold text-zinc-900">
              {netVotes > 0 ? `+${netVotes}` : netVotes}
            </span>

            <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="voteType" value="downvote" />
              <input type="hidden" name="returnPath" value={returnPath} />
              <PendingSubmitButton
                className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-blue-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
                pendingLabel="..."
                disabled={!user}
              >
                ▼
              </PendingSubmitButton>
            </form>
          </div>

          <div className="flex-1">
            <p className="whitespace-pre-wrap text-zinc-800">{post.content}</p>
          </div>
        </div>
      </div>

      <section id="comments" className="space-y-5">
        <h2 className="text-xl font-semibold text-zinc-950">Comments ({comments.length})</h2>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          {user ? (
            <form action={createForumCommentAction} className="space-y-3">
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <label htmlFor="comment-content" className="block text-sm font-medium text-zinc-800">
                Add your comment
              </label>
              <textarea
                id="comment-content"
                name="content"
                rows={4}
                required
                placeholder="Share your advice, experience, or answer..."
                className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-300 focus:bg-white"
              />
              <PendingSubmitButton
                className="rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                pendingLabel="Posting..."
              >
                Post Comment
              </PendingSubmitButton>
            </form>
          ) : (
            <p className="text-sm text-zinc-600">
              Please <Link href="/login" className="font-medium text-blue-600 hover:underline">log in</Link> to comment.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const commentAuthorLabel = formatUserLabel(
                comment.user_id,
                user?.id,
                comment.commente_by?.trim() || comment.commented_by?.trim() || undefined,
                trainerIds.has(comment.user_id),
              );

              return (
                <article key={comment.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold uppercase text-white">
                      {getInitials(commentAuthorLabel)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{commentAuthorLabel}</p>
                      <p className="text-xs text-zinc-500">{getTimeAgo(new Date(comment.created_at))}</p>
                    </div>
                    </div>
                    {user?.id === comment.user_id ? (
                      <form action={deleteForumCommentAction}>
                        <input type="hidden" name="commentId" value={comment.id} />
                        <input type="hidden" name="postId" value={post.id} />
                        <input type="hidden" name="returnPath" value={returnPath} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap border-l-2 border-zinc-200 pl-3 text-sm leading-6 text-zinc-800">
                    {comment.content}
                  </p>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
              No comments yet. Start the discussion.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) return "just now";
  if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
  if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
  if (secondsAgo < 2592000) return `${Math.floor(secondsAgo / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatUserLabel(
  authorId: string,
  currentUserId?: string,
  snapshotName?: string,
  isTrainer?: boolean,
): string {
  if (authorId === currentUserId) {
    return "you";
  }

  const baseName = snapshotName || toUsername(authorId);
  return isTrainer ? `${baseName} - Trainer` : baseName;
}

function getInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return "?";
  }

  const words = normalized.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() || "").join("") || normalized[0].toUpperCase();
}

function toUsername(userId: string): string {
  return `user-${userId.slice(0, 6)}`;
}

function isMissingCommenterColumnError(message?: string) {
  const lower = String(message || "").toLowerCase();
  return lower.includes("column") && (lower.includes("commente_by") || lower.includes("commented_by"));
}

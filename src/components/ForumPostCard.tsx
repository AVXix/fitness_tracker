import Link from "next/link";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { deleteForumPostAction, voteForumPostAction } from "@/app/actions/forum-actions";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  author_name?: string;
}

interface ForumPostCardProps {
  post: ForumPost;
  currentUserId?: string;
}

export function ForumPostCard({ post, currentUserId }: ForumPostCardProps) {
  const netVotes = post.upvotes - post.downvotes;
  const timeAgo = getTimeAgo(new Date(post.created_at));
  const postHref = `/forum/${post.id}`;
  const authorLabel = post.user_id === currentUserId ? "you" : post.author_name || toUsername(post.user_id);

  return (
    <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 hover:bg-zinc-50">
      {/* Vote Section */}
      <div className="flex w-12 flex-col items-center gap-1 bg-zinc-100 py-3">
        <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="voteType" value="upvote" />
          <input type="hidden" name="returnPath" value="/forum" />
          <PendingSubmitButton
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-orange-100 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            pendingLabel="..."
            disabled={!currentUserId}
          >
            ▲
          </PendingSubmitButton>
        </form>

        <span className="text-sm font-semibold text-zinc-900 min-w-[2rem] text-center">
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>

        <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="voteType" value="downvote" />
          <input type="hidden" name="returnPath" value="/forum" />
          <PendingSubmitButton
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-blue-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            pendingLabel="..."
            disabled={!currentUserId}
          >
            ▼
          </PendingSubmitButton>
        </form>
      </div>

      {/* Post Content */}
      <div className="flex-1 p-4">
        <p className="text-xs text-zinc-500">Posted {timeAgo} by {authorLabel}</p>
        <Link href={postHref} className="mt-1 block text-lg font-semibold text-zinc-950 hover:text-blue-600">
          {post.title}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{post.content}</p>

        {/* Post Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <Link href={`${postHref}#comments`} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100 hover:text-blue-600">
            💬 {post.comment_count} comments
          </Link>
          {currentUserId === post.user_id ? (
            <form action={deleteForumPostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="returnPath" value="/forum" />
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function toUsername(userId: string): string {
  return `user-${userId.slice(0, 6)}`;
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

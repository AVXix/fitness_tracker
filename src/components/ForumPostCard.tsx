import { voteForumPostAction } from "@/app/fitness-actions";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  user_id: string;
}

interface ForumPostCardProps {
  post: ForumPost;
  currentUserId?: string;
}

export function ForumPostCard({ post, currentUserId }: ForumPostCardProps) {
  const netVotes = post.upvotes - post.downvotes;
  const timeAgo = getTimeAgo(new Date(post.created_at));

  return (
    <div className="flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors">
      {/* Vote Section */}
      <div className="flex flex-col items-center gap-1">
        <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="voteType" value="upvote" />
          <button
            type="submit"
            className="rounded-md p-1 text-zinc-400 hover:bg-orange-100 hover:text-orange-600 transition-colors"
            disabled={!currentUserId}
          >
            <span>▲</span>
          </button>
        </form>

        <span className="text-sm font-semibold text-zinc-900 min-w-[2rem] text-center">
          {netVotes > 0 ? `+${netVotes}` : netVotes}
        </span>

        <form action={voteForumPostAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="voteType" value="downvote" />
          <button
            type="submit"
            className="rounded-md p-1 text-zinc-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            disabled={!currentUserId}
          >
            <span>▼</span>
          </button>
        </form>
      </div>

      {/* Post Content */}
      <div className="flex-1">
        <h3 className="font-semibold text-lg text-zinc-950 hover:text-blue-600 cursor-pointer">
          {post.title}
        </h3>
        <p className="mt-2 text-zinc-700 line-clamp-2">{post.content}</p>

        {/* Post Metadata */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
          <span>Posted {timeAgo}</span>
          <a href="#" className="flex items-center gap-1 hover:text-blue-600">
            💬 {post.comment_count} comments
          </a>
          <span>👁️ {Math.max(1, post.upvotes + post.downvotes)} views</span>
        </div>
      </div>
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

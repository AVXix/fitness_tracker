import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ForumPageContent } from "@/components/ForumPageContent";
import { ensureForumSchema } from "@/lib/supabase/ensure-schema";

export const dynamic = "force-dynamic";

type SortBy = "recent" | "discussed" | "trending";

const HOT_SCORE_WEIGHTS = {
  upvote: 3,
  downvote: 2,
  comment: 2,
  agePenaltyPerHour: 0.15,
  gracePeriodHours: 2,
} as const;

interface ForumPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
  user_id: string;
  posted_by?: string | null;
  author_name?: string;
  is_trainer?: boolean;
}

interface ForumPostBase {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  posted_by?: string | null;
}

type ForumSearchParams =
  | Promise<{ sort?: string | string[]; voteError?: string | string[] }>
  | { sort?: string | string[]; voteError?: string | string[] };

export default async function ForumPage({ searchParams }: { searchParams: ForumSearchParams }) {
  const user = await getCurrentUser();
  if (user) {
    await ensureForumSchema();
  }

  const supabase = await createSupabaseServerClient();
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const sortValue = resolvedSearchParams.sort;
  const voteErrorValue = resolvedSearchParams.voteError;
  const sortByCandidate = Array.isArray(sortValue) ? sortValue[0] : sortValue;
  const voteErrorCandidate = Array.isArray(voteErrorValue) ? voteErrorValue[0] : voteErrorValue;
  const sortBy = (["trending", "recent", "discussed"].includes(sortByCandidate || "")
    ? sortByCandidate
    : "trending") as SortBy;

  let posts: ForumPost[] = [];

  if (supabase) {
    const { data: basePosts } = await supabase
      .from("forum_posts")
      .select("id, title, content, created_at, user_id, posted_by")
      .order("created_at", { ascending: false })
      .limit(50);

    const postRows = ((basePosts || []) as ForumPostBase[]).map((post) => ({
      ...post,
      posted_by: post.posted_by ?? null,
    }));

    if (postRows.length > 0) {
      const postIds = postRows.map((post) => post.id);
      const userIds = [...new Set(postRows.map((post) => post.user_id))];

      const [{ data: comments }, { data: votes }, { data: trainers }] = await Promise.all([
        supabase
          .from("forum_comments")
          .select("post_id")
          .in("post_id", postIds),
        supabase
          .from("forum_votes")
          .select("post_id, vote_type")
          .in("post_id", postIds),
        userIds.length > 0
          ? supabase
              .from("profiles")
              .select("id, is_trainer")
              .in("id", userIds)
          : Promise.resolve({ data: null }),
      ]);

      const trainerIds = new Set<string>();
      for (const row of trainers || []) {
        if (row.is_trainer) {
          trainerIds.add(row.id);
        }
      }

      const commentCounts = new Map<string, number>();
      for (const comment of comments || []) {
        const postId = String(comment.post_id);
        commentCounts.set(postId, (commentCounts.get(postId) || 0) + 1);
      }

      const voteTotals = new Map<string, { upvotes: number; downvotes: number }>();
      for (const vote of votes || []) {
        const postId = String(vote.post_id);
        const current = voteTotals.get(postId) || { upvotes: 0, downvotes: 0 };
        if (vote.vote_type === "upvote") {
          current.upvotes += 1;
        } else if (vote.vote_type === "downvote") {
          current.downvotes += 1;
        }
        voteTotals.set(postId, current);
      }

      posts = postRows.map((post) => {
        const voteCount = voteTotals.get(post.id) || { upvotes: 0, downvotes: 0 };
        const isTrainer = trainerIds.has(post.user_id);
        const baseName = post.posted_by?.trim() || toUsername(post.user_id);
        const authorName = isTrainer ? `${baseName} - Trainer` : baseName;
        return {
          ...post,
          author_name: authorName,
          is_trainer: isTrainer,
          upvotes: voteCount.upvotes,
          downvotes: voteCount.downvotes,
          comment_count: commentCounts.get(post.id) || 0,
        };
      });
    }

    if (sortBy === "discussed") {
      posts.sort((a, b) => b.comment_count - a.comment_count || b.created_at.localeCompare(a.created_at));
    } else if (sortBy === "trending") {
      posts.sort((a, b) => {
        const hotScoreA = calculateHotScore(a);
        const hotScoreB = calculateHotScore(b);
        const netVotesA = a.upvotes - a.downvotes;
        const netVotesB = b.upvotes - b.downvotes;

        return (
          hotScoreB - hotScoreA ||
          netVotesB - netVotesA ||
          b.comment_count - a.comment_count ||
          b.created_at.localeCompare(a.created_at)
        );
      });
    }
  }

  return (
    <ForumPageContent
      posts={posts}
      user={user}
      sortBy={sortBy}
      voteError={voteErrorCandidate || null}
    />
  );
}

function toUsername(userId: string): string {
  return `user-${userId.slice(0, 6)}`;
}

function calculateHotScore(post: Pick<ForumPost, "upvotes" | "downvotes" | "comment_count" | "created_at">): number {
  const createdAtMs = new Date(post.created_at).getTime();
  const nowMs = Date.now();
  const ageHours = Number.isFinite(createdAtMs) ? Math.max(0, (nowMs - createdAtMs) / 3_600_000) : 0;
  const agePenaltyHours = Math.max(0, ageHours - HOT_SCORE_WEIGHTS.gracePeriodHours);

  return (
    post.upvotes * HOT_SCORE_WEIGHTS.upvote +
    post.comment_count * HOT_SCORE_WEIGHTS.comment -
    post.downvotes * HOT_SCORE_WEIGHTS.downvote -
    agePenaltyHours * HOT_SCORE_WEIGHTS.agePenaltyPerHour
  );
}

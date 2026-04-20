import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ForumPageContent } from "@/components/ForumPageContent";

export const dynamic = "force-dynamic";

type SortBy = "recent" | "discussed" | "trending";

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

export default async function ForumPage({ searchParams }: { searchParams: { sort?: string } }) {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const sortBy = (searchParams.sort || "trending") as SortBy;

  let posts: ForumPost[] = [];

  if (supabase) {
    let query = supabase
      .from("forum_posts")
      .select("id, title, content, upvotes, downvotes, comment_count, created_at, user_id");

    // Sort based on filter
    if (sortBy === "recent") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "discussed") {
      query = query.order("comment_count", { ascending: false });
    } else if (sortBy === "trending") {
      // Trending: recent posts with good upvotes (last 7 days with upvotes > downvotes)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query
        .gte("created_at", sevenDaysAgo.toISOString())
        .gt("upvotes", 0)
        .order("upvotes", { ascending: false });
    }

    const { data } = await query.limit(50);
    posts = data || [];
  }

  return <ForumPageContent posts={posts} user={user} sortBy={sortBy} />;
}

"use client";

import { useRef } from "react";
import { ForumPostCard } from "@/components/ForumPostCard";
import { CreatePostForm } from "@/components/CreatePostForm";

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

interface ForumPageContentProps {
  posts: ForumPost[];
  user: { id: string } | null;
  sortBy: SortBy;
}

export function ForumPageContent({ posts, user, sortBy }: ForumPageContentProps) {
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleNewDiscussionClick = () => {
    if (modalTriggerRef.current) {
      modalTriggerRef.current.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with New Discussion Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Fitness Community Forum</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Share your fitness journey, ask questions, and get support from the community
          </p>
        </div>
        <button
          onClick={handleNewDiscussionClick}
          className="whitespace-nowrap rounded-xl bg-zinc-950 px-4 py-2.5 text-white font-medium hover:bg-zinc-800 transition-colors h-fit"
        >
          + New Discussion
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 border-b border-zinc-200">
        <FilterTab
          label="🔥 Trending"
          value="trending"
          isActive={sortBy === "trending"}
        />
        <FilterTab
          label="⏰ Most Recent"
          value="recent"
          isActive={sortBy === "recent"}
        />
        <FilterTab
          label="💬 Most Discussed"
          value="discussed"
          isActive={sortBy === "discussed"}
        />
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {posts.length > 0 ? (
          posts.map((post) => (
            <ForumPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-600">
              {sortBy === "trending"
                ? "No trending posts yet. Be the first to start a discussion!"
                : sortBy === "discussed"
                ? "No discussions yet."
                : "No recent posts yet."}
            </p>
          </div>
        )}
      </div>

      {/* Create Post Form Modal */}
      <CreatePostForm isLoggedIn={!!user} triggerRef={modalTriggerRef} />
    </div>
  );
}

function FilterTab({ label, value, isActive }: { label: string; value: string; isActive: boolean }) {
  return (
    <a
      href={`?sort=${value}`}
      className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
        isActive
          ? "border-zinc-950 text-zinc-950"
          : "border-transparent text-zinc-600 hover:text-zinc-900"
      }`}
    >
      {label}
    </a>
  );
}

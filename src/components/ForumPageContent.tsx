"use client";

import Link from "next/link";
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
  voteError?: string | null;
}

export function ForumPageContent({ posts, user, sortBy, voteError }: ForumPageContentProps) {
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleNewDiscussionClick = () => {
    if (modalTriggerRef.current) {
      modalTriggerRef.current.click();
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        {voteError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Vote failed: {voteError}
          </div>
        ) : null}

        <div className="flex items-start justify-between rounded-xl border border-zinc-200 bg-white p-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">FitTracker</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Community tips, progress updates, and training Q&A.
            </p>
          </div>
          <button
            onClick={handleNewDiscussionClick}
            className="h-fit whitespace-nowrap rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
          >
            Create Post
          </button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-white p-2">
          <FilterTab
            label="Hot"
            value="trending"
            isActive={sortBy === "trending"}
          />
          <FilterTab
            label="New"
            value="recent"
            isActive={sortBy === "recent"}
          />
          <FilterTab
            label="Top"
            value="discussed"
            isActive={sortBy === "discussed"}
          />
        </div>

        <div className="space-y-2">
          {posts.length > 0 ? (
            posts.map((post) => (
              <ForumPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
              <p className="text-zinc-600">
                {sortBy === "trending"
                  ? "No hot posts yet. Start the first thread."
                  : sortBy === "discussed"
                  ? "No top discussions yet."
                  : "No new posts yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden space-y-4 lg:block">
        {voteError?.includes("forum_votes") ? (
          <div className="sticky top-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <h2 className="text-sm font-semibold text-yellow-900">⚠️ Setup Required</h2>
            <p className="mt-2 text-xs text-yellow-800">
              Forum voting needs a database table. See the{" "}
              <a
                href="/FORUM_SETUP.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                setup guide
              </a>
              .
            </p>
          </div>
        ) : null}
        
        <div className="sticky top-8 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">About FitTracker</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Ask workout questions, share routines, and help others stay consistent.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-zinc-100 px-2 py-2">
              <div className="text-base font-semibold text-zinc-900">{posts.length}</div>
              <div className="text-zinc-600">Posts</div>
            </div>
            <div className="rounded-lg bg-zinc-100 px-2 py-2">
              <div className="text-base font-semibold text-zinc-900">24/7</div>
              <div className="text-zinc-600">Active</div>
            </div>
            <div className="rounded-lg bg-zinc-100 px-2 py-2">
              <div className="text-base font-semibold text-zinc-900">+1</div>
              <div className="text-zinc-600">Daily</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Create Post Form Modal */}
      <CreatePostForm isLoggedIn={!!user} triggerRef={modalTriggerRef} />
    </div>
  );
}

function FilterTab({ label, value, isActive }: { label: string; value: string; isActive: boolean }) {
  return (
    <Link
      href={`?sort=${value}`}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

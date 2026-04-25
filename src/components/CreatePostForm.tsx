"use client";

import { useState } from "react";
import { createForumPostAction } from "@/app/fitness-actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

interface CreatePostFormProps {
  isLoggedIn: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function CreatePostForm({ isLoggedIn, triggerRef }: CreatePostFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        style={{ display: "none" }}
      />

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-950">Start a Discussion</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-zinc-600 mb-5">
              Ask a question or share your fitness tips with the community
            </p>

            {isLoggedIn ? (
              <form action={createForumPostAction} className="space-y-4">
                <div>
                  <label htmlFor="title" className="mb-2 block text-sm font-medium text-zinc-800">
                    Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g., Best exercises for building chest muscle?"
                    required
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5"
                  />
                </div>

                <div>
                  <label htmlFor="content" className="mb-2 block text-sm font-medium text-zinc-800">
                    Description *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    rows={4}
                    placeholder="Share more details about your question or tip..."
                    required
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <PendingSubmitButton
                    className="flex-1 rounded-full bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
                    pendingLabel="Posting..."
                  >
                    Post
                  </PendingSubmitButton>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-zinc-600">
                Please <a href="/login" className="font-medium text-blue-600 hover:underline">log in</a> to post a discussion.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

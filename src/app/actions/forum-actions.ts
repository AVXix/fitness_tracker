"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { isMissingForumIdentityColumnError, resolveForumAuthorName } from "./shared";

export async function createForumPostAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    return;
  }

  const authorName = await resolveForumAuthorName(supabase, user);

  const postInsertPayloads = [
    { user_id: user.id, title, content, posted_by: authorName, author_name: authorName },
    { user_id: user.id, title, content, posted_by: authorName },
    { user_id: user.id, title, content, author_name: authorName },
    { user_id: user.id, title, content },
  ];

  let postInserted = false;
  for (const payload of postInsertPayloads) {
    const { error } = await supabase.from("forum_posts").insert(payload);

    if (!error) {
      postInserted = true;
      break;
    }

    if (!isMissingForumIdentityColumnError(error.message)) {
      return;
    }
  }

  if (!postInserted) {
    return;
  }

  revalidatePath("/forum");
  redirect("/forum?sort=recent");
}

export async function createForumCommentAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const returnPath = String(formData.get("returnPath") ?? "").trim();

  if (!postId || !content) {
    return;
  }

  const authorName = await resolveForumAuthorName(supabase, user);

  const commentInsertPayloads = [
    {
      post_id: postId,
      user_id: user.id,
      content,
      commente_by: authorName,
      commented_by: authorName,
      author_name: authorName,
    },
    { post_id: postId, user_id: user.id, content, commented_by: authorName },
    { post_id: postId, user_id: user.id, content, commente_by: authorName },
    { post_id: postId, user_id: user.id, content, author_name: authorName },
    { post_id: postId, user_id: user.id, content },
  ];

  let commentInserted = false;
  for (const payload of commentInsertPayloads) {
    const { error } = await supabase.from("forum_comments").insert(payload);

    if (!error) {
      commentInserted = true;
      break;
    }

    if (!isMissingForumIdentityColumnError(error.message)) {
      return;
    }
  }

  if (!commentInserted) {
    return;
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);

  if (returnPath.startsWith("/forum")) {
    revalidatePath(returnPath);
  }
}

export async function voteForumPostAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const voteType = String(formData.get("voteType") ?? "").trim() as "upvote" | "downvote";
  const returnPath = String(formData.get("returnPath") ?? "").trim();
  const safeReturnPath = returnPath.startsWith("/forum") ? returnPath : "/forum";

  const mapVoteError = (message: string) => {
    const lower = message.toLowerCase();

    if (lower.includes("could not find the table") && lower.includes("forum_votes")) {
      return "forum_votes table missing in connected Supabase project. Run latest forum vote migrations and reload schema cache.";
    }

    return message;
  };

  const redirectWithVoteError = (message: string) => {
    const separator = safeReturnPath.includes("?") ? "&" : "?";
    const safeMessage = mapVoteError(message).slice(0, 220);
    redirect(`${safeReturnPath}${separator}voteError=${encodeURIComponent(safeMessage)}`);
  };

  if (!postId || !["upvote", "downvote"].includes(voteType)) {
    redirectWithVoteError("Invalid vote request.");
  }

  const { data: existingVotes, error: existingVoteError } = await supabase
    .from("forum_votes")
    .select("id, vote_type, created_at")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .is("comment_id", null)
    .order("created_at", { ascending: false });

  if (existingVoteError) {
    redirectWithVoteError(existingVoteError.message || "Unable to check your existing vote.");
  }

  const primaryVote = existingVotes?.[0] || null;
  const staleVoteIds = (existingVotes || []).slice(1).map((vote) => vote.id);

  if (primaryVote) {
    if (primaryVote.vote_type === voteType) {
      const { error: deleteError } = await supabase
        .from("forum_votes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .is("comment_id", null);

      if (deleteError) {
        redirectWithVoteError(deleteError.message || "Could not remove your vote.");
      }
    } else {
      const { error: updateError } = await supabase
        .from("forum_votes")
        .update({ vote_type: voteType })
        .eq("id", primaryVote.id);

      if (updateError) {
        redirectWithVoteError(updateError.message || "Could not update your vote.");
      }

      if (staleVoteIds.length > 0) {
        const { error: staleDeleteError } = await supabase.from("forum_votes").delete().in("id", staleVoteIds);
        if (staleDeleteError) {
          redirectWithVoteError(staleDeleteError.message || "Could not clean up duplicate votes.");
        }
      }
    }
  } else {
    const { error: insertError } = await supabase.from("forum_votes").insert({
      user_id: user.id,
      post_id: postId,
      vote_type: voteType,
    });

    if (insertError) {
      redirectWithVoteError(insertError.message || "Could not save your vote.");
    }
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);

  if (safeReturnPath.startsWith("/forum")) {
    revalidatePath(safeReturnPath);
    redirect(safeReturnPath);
  }

  redirect("/forum");
}

export async function deleteForumPostAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const postId = String(formData.get("postId") ?? "").trim();
  const returnPath = String(formData.get("returnPath") ?? "").trim();
  const safeReturnPath = returnPath.startsWith("/forum") ? returnPath : "/forum";

  if (!postId) {
    return;
  }

  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return;
  }

  revalidatePath("/forum");
  revalidatePath(`/forum/${postId}`);

  redirect(safeReturnPath);
}

export async function deleteForumCommentAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const commentId = String(formData.get("commentId") ?? "").trim();
  const postId = String(formData.get("postId") ?? "").trim();
  const returnPath = String(formData.get("returnPath") ?? "").trim();
  const safeReturnPath = returnPath.startsWith("/forum") ? returnPath : postId ? `/forum/${postId}` : "/forum";

  if (!commentId) {
    return;
  }

  const { error } = await supabase
    .from("forum_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return;
  }

  revalidatePath("/forum");
  if (postId) {
    revalidatePath(`/forum/${postId}`);
  }
  revalidatePath(safeReturnPath);

  redirect(safeReturnPath);
}

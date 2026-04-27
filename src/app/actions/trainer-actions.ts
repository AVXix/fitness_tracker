"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

type HireRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export async function requestTrainerHireAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const trainerUserId = String(formData.get("trainerUserId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!trainerUserId || trainerUserId === user.id) {
    redirect("/trainers?trainerError=Invalid+trainer+request.");
  }

  const { data: existingPending, error: pendingError } = await supabase
    .from("trainer_hire_requests")
    .select("id")
    .eq("client_user_id", user.id)
    .eq("trainer_user_id", trainerUserId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    const safeMessage = (pendingError.message || "Failed to validate existing hire request.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  if (existingPending?.id) {
    redirect("/trainers?trainerSuccess=You+already+have+a+pending+hire+request+for+this+trainer.");
  }

  const { error } = await supabase.from("trainer_hire_requests").insert({
    client_user_id: user.id,
    trainer_user_id: trainerUserId,
    message: message || null,
  });

  if (error) {
    const safeMessage = (error.message || "Failed to send hire request.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  revalidatePath("/trainers");
  redirect("/trainers?trainerSuccess=Hire+request+sent.");
}

export async function updateHireRequestStatusAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const requestedStatus = String(formData.get("nextStatus") ?? "").trim().toLowerCase() as HireRequestStatus;

  if (!requestId || !["accepted", "rejected", "cancelled"].includes(requestedStatus)) {
    redirect("/trainers?trainerError=Invalid+request+update.");
  }

  const { data: requestRow, error: lookupError } = await supabase
    .from("trainer_hire_requests")
    .select("id, client_user_id, trainer_user_id, status")
    .eq("id", requestId)
    .maybeSingle<{
      id: string;
      client_user_id: string;
      trainer_user_id: string;
      status: HireRequestStatus;
    }>();

  if (lookupError || !requestRow) {
    const safeMessage = (lookupError?.message || "Hire request not found.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  if (requestRow.status !== "pending") {
    redirect("/trainers?trainerError=Only+pending+requests+can+be+updated.");
  }

  const isTrainerDecision = requestedStatus === "accepted" || requestedStatus === "rejected";
  const isClientCancel = requestedStatus === "cancelled";

  if (isTrainerDecision && user.id !== requestRow.trainer_user_id) {
    redirect("/trainers?trainerError=Only+the+trainer+can+accept+or+reject+this+request.");
  }

  if (isClientCancel && user.id !== requestRow.client_user_id) {
    redirect("/trainers?trainerError=Only+the+client+can+cancel+this+request.");
  }

  const { error: updateError } = await supabase
    .from("trainer_hire_requests")
    .update({
      status: requestedStatus,
      responded_at: new Date().toISOString(),
      responded_by: user.id,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) {
    const safeMessage = (updateError.message || "Failed to update hire request.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  const statusMessage =
    requestedStatus === "accepted"
      ? "Hire+request+accepted."
      : requestedStatus === "rejected"
        ? "Hire+request+rejected."
        : "Hire+request+cancelled.";

  revalidatePath("/trainers");
  redirect(`/trainers?trainerSuccess=${statusMessage}`);
}

export async function rateTrainerAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const trainerUserId = String(formData.get("trainerUserId") ?? "").trim();
  const rawRating = String(formData.get("rating") ?? "").trim();
  const rating = Number.parseInt(rawRating, 10);
  const review = String(formData.get("review") ?? "").trim();

  if (!trainerUserId || trainerUserId === user.id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect("/trainers?ratingError=Choose+a+rating+between+1+and+5.");
  }

  const { error } = await supabase.from("trainer_ratings").upsert(
    {
      user_id: user.id,
      trainer_user_id: trainerUserId,
      rating,
      review: review || null,
    },
    { onConflict: "user_id,trainer_user_id" },
  );

  if (error) {
    const message = String(error.message || "").toLowerCase();
    const readable = message.includes("could not find the table") || message.includes("does not exist")
      ? "trainer_ratings table missing. Run trainer rating migrations in Supabase first."
      : (error.message || "Failed to save rating.");
    redirect(`/trainers?ratingError=${encodeURIComponent(readable.slice(0, 220))}`);
  }

  revalidatePath("/trainers");
  redirect("/trainers?ratingSuccess=Rating+saved.");
}

export async function removeHireRequestAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return;
  }

  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!requestId) {
    redirect("/trainers?trainerError=Invalid+request.");
  }

  const { data: requestRow, error: lookupError } = await supabase
    .from("trainer_hire_requests")
    .select("id, client_user_id, trainer_user_id")
    .eq("id", requestId)
    .maybeSingle<{
      id: string;
      client_user_id: string;
      trainer_user_id: string;
    }>();

  if (lookupError || !requestRow) {
    const safeMessage = (lookupError?.message || "Hire request not found.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  const canRemove = user.id === requestRow.client_user_id || user.id === requestRow.trainer_user_id;
  if (!canRemove) {
    redirect("/trainers?trainerError=You+cannot+remove+this+request.");
  }

  const { error: deleteError } = await supabase
    .from("trainer_hire_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    const safeMessage = (deleteError.message || "Failed to remove request.").slice(0, 220);
    redirect(`/trainers?trainerError=${encodeURIComponent(safeMessage)}`);
  }

  revalidatePath("/trainers");
  redirect("/trainers?trainerSuccess=Request+removed.");
}

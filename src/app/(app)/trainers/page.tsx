import { rateTrainerAction, requestTrainerHireAction, updateHireRequestStatusAction } from "@/app/fitness-actions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTrainerSchema } from "@/lib/supabase/ensure-schema";

export const dynamic = "force-dynamic";

interface TrainerProfile {
  id: string;
  display_name: string | null;
  bio: string | null;
  trainer_contact: string | null;
}

interface TrainerRating {
  trainer_user_id: string;
  user_id: string;
  rating: number;
  review: string | null;
}

interface HireRequestRow {
  id: string;
  client_user_id: string;
  trainer_user_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
}

interface NameRow {
  id: string;
  display_name: string | null;
}

function getAverageRating(ratings: TrainerRating[]) {
  if (!ratings.length) {
    return null;
  }

  const total = ratings.reduce((sum, row) => sum + row.rating, 0);
  return total / ratings.length;
}

export default async function TrainersPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{
        ratingError?: string | string[];
        ratingSuccess?: string | string[];
        trainerError?: string | string[];
        trainerSuccess?: string | string[];
      }>
    | {
        ratingError?: string | string[];
        ratingSuccess?: string | string[];
        trainerError?: string | string[];
        trainerSuccess?: string | string[];
      };
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const ratingErrorValue = resolvedSearchParams.ratingError;
  const ratingSuccessValue = resolvedSearchParams.ratingSuccess;
  const trainerErrorValue = resolvedSearchParams.trainerError;
  const trainerSuccessValue = resolvedSearchParams.trainerSuccess;
  const ratingError = Array.isArray(ratingErrorValue) ? ratingErrorValue[0] : ratingErrorValue;
  const ratingSuccess = Array.isArray(ratingSuccessValue) ? ratingSuccessValue[0] : ratingSuccessValue;
  const trainerError = Array.isArray(trainerErrorValue) ? trainerErrorValue[0] : trainerErrorValue;
  const trainerSuccess = Array.isArray(trainerSuccessValue) ? trainerSuccessValue[0] : trainerSuccessValue;
  const user = await getCurrentUser();
  if (user) {
    await ensureTrainerSchema();
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Supabase is not configured.
      </div>
    );
  }

  const { data: trainers } = await supabase
    .from("profiles")
    .select("id, display_name, bio, trainer_contact")
    .eq("is_trainer", true)
    .order("updated_at", { ascending: false })
    .returns<TrainerProfile[]>();

  const { data: myProfile } = user
    ? await supabase
        .from("profiles")
        .select("is_trainer")
        .eq("id", user.id)
        .maybeSingle<{ is_trainer: boolean | null }>()
    : { data: null };

  const { data: hireRequests, error: hireRequestsError } = user
    ? await supabase
        .from("trainer_hire_requests")
        .select("id, client_user_id, trainer_user_id, message, status, created_at")
        .or(`client_user_id.eq.${user.id},trainer_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .returns<HireRequestRow[]>()
    : { data: [] as HireRequestRow[], error: null };

  const allParticipantIds = [...new Set((hireRequests || []).flatMap((row) => [row.client_user_id, row.trainer_user_id]))];

  const { data: participantNames } = allParticipantIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allParticipantIds)
        .returns<NameRow[]>()
    : { data: [] as NameRow[] };

  const nameByUserId = new Map<string, string>();
  for (const row of participantNames || []) {
    const safe = (row.display_name || "").trim() || `user-${row.id.slice(0, 6)}`;
    nameByUserId.set(row.id, safe);
  }

  const outgoingRequests = (hireRequests || []).filter((row) => row.client_user_id === user?.id);
  const incomingRequests = (hireRequests || []).filter((row) => row.trainer_user_id === user?.id);
  const outgoingByTrainer = new Map<string, HireRequestRow>();
  for (const row of outgoingRequests) {
    if (!outgoingByTrainer.has(row.trainer_user_id)) {
      outgoingByTrainer.set(row.trainer_user_id, row);
    }
  }

  const isCurrentUserTrainer = !!myProfile?.is_trainer;

  const onlyOwnTrainerVisible =
    !!user && (trainers || []).length === 1 && (trainers || [])[0]?.id === user.id;

  const trainerIds = (trainers || []).map((trainer) => trainer.id);

  const { data: ratings, error: ratingsError } = trainerIds.length
    ? await supabase
        .from("trainer_ratings")
        .select("trainer_user_id, user_id, rating, review")
        .in("trainer_user_id", trainerIds)
        .returns<TrainerRating[]>()
    : { data: [] as TrainerRating[], error: null };

  const ratingsByTrainer = new Map<string, TrainerRating[]>();
  for (const rating of ratings || []) {
    const group = ratingsByTrainer.get(rating.trainer_user_id) || [];
    group.push(rating);
    ratingsByTrainer.set(rating.trainer_user_id, group);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Hire Trainers</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Browse trainer profiles, contact them, and share ratings.
        </p>
      </div>
      {ratingsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Ratings unavailable:{" "}
          {ratingsError.message.toLowerCase().includes("could not find the table")
            ? "trainer_ratings table missing. Run the trainer rating migrations in Supabase."
            : ratingsError.message}
        </div>
      ) : null}
      {ratingError || trainerError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {ratingError || trainerError}
        </div>
      ) : null}
      {hireRequestsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load hire requests: {hireRequestsError.message}
        </div>
      ) : null}
      {ratingSuccess || trainerSuccess ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {ratingSuccess || trainerSuccess}
        </div>
      ) : null}
      {onlyOwnTrainerVisible ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          You are currently seeing only your own trainer profile. Ratings are submitted by other users.
          If other trainers are missing, run the trainers profile visibility migration in Supabase.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-4">
          {(trainers || []).length > 0 ? (
            (trainers || []).map((trainer) => {
            const trainerRatings = ratingsByTrainer.get(trainer.id) || [];
            const average = getAverageRating(trainerRatings);
            const myRating = trainerRatings.find((row) => row.user_id === user?.id) || null;
            const reviewsCount = trainerRatings.filter((row) => (row.review || "").trim().length > 0).length;
            const myHireRequest = outgoingByTrainer.get(trainer.id) || null;
            const hasPendingHireRequest = myHireRequest?.status === "pending";

            return (
              <article key={trainer.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">
                      {(trainer.display_name || `user-${trainer.id.slice(0, 6)}`).trim()}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {average ? `Average rating ${average.toFixed(1)} / 5` : "No ratings yet."}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {trainerRatings.length > 0
                        ? `Based on ${trainerRatings.length} user rating${trainerRatings.length > 1 ? "s" : ""}${reviewsCount ? `, including ${reviewsCount} written review${reviewsCount > 1 ? "s" : ""}` : ""}.`
                        : "Be the first user to submit a rating below."}
                    </p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">
                  {trainer.bio?.trim() || "No trainer bio yet."}
                </p>

                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm">
                  <span className="font-medium text-zinc-900">Contact: </span>
                  <span className="text-zinc-700">
                    {trainer.trainer_contact?.trim() || "Contact not provided yet."}
                  </span>
                </div>

                {user && user.id !== trainer.id ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <form action={requestTrainerHireAction} className="space-y-2 rounded-xl border border-zinc-200 p-3">
                      <input type="hidden" name="trainerUserId" value={trainer.id} />
                      <label htmlFor={`hire-message-${trainer.id}`} className="block text-sm font-medium text-zinc-800">
                        Hire request message
                      </label>
                      <textarea
                        id={`hire-message-${trainer.id}`}
                        name="message"
                        rows={2}
                        placeholder="Hi, I want coaching for strength training."
                        disabled={hasPendingHireRequest}
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                      {myHireRequest ? (
                        <p className="text-xs text-zinc-600">
                          Latest request status: <span className="font-medium uppercase">{myHireRequest.status}</span>
                        </p>
                      ) : null}
                      <PendingSubmitButton
                        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                        pendingLabel={hasPendingHireRequest ? "Already Pending" : "Sending..."}
                        disabled={hasPendingHireRequest}
                      >
                        {hasPendingHireRequest ? "Request Pending" : "Send Hire Request"}
                      </PendingSubmitButton>
                    </form>

                    <form action={rateTrainerAction} className="space-y-2 rounded-xl border border-zinc-200 p-3">
                      <input type="hidden" name="trainerUserId" value={trainer.id} />
                      <fieldset>
                        <legend className="block text-sm font-medium text-zinc-800">
                          Your rating (used in average)
                        </legend>
                        <p className="mt-1 text-xs text-zinc-500">Click a star from 1 to 5</p>
                        <div className="mt-2 flex flex-row-reverse justify-end gap-1">
                          {[5, 4, 3, 2, 1].map((value) => (
                            <div key={value}>
                              <input
                                id={`rating-${trainer.id}-${value}`}
                                type="radio"
                                name="rating"
                                value={value}
                                defaultChecked={myRating?.rating === value}
                                required={value === 1}
                                className="peer sr-only"
                              />
                              <label
                                htmlFor={`rating-${trainer.id}-${value}`}
                                className="cursor-pointer text-3xl leading-none text-zinc-500 transition-colors peer-checked:text-amber-500 hover:text-amber-400"
                                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                              >
                                ★
                              </label>
                            </div>
                          ))}
                        </div>
                      </fieldset>
                      <textarea
                        name="review"
                        rows={2}
                        defaultValue={myRating?.review ?? ""}
                        placeholder="Share your experience"
                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                      />
                      <PendingSubmitButton
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800"
                        pendingLabel="Saving..."
                      >
                        Save Rating
                      </PendingSubmitButton>
                    </form>
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                    {user
                      ? "You cannot rate your own trainer profile. Ask another user account to rate you."
                      : "Log in to send a hire request and submit a star rating."}
                  </div>
                )}
              </article>
            );
            })
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600">
              No trainers available yet.
            </div>
          )}
        </div>

        {user ? (
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">My Hire Requests</h2>
              <p className="mt-1 text-xs text-zinc-600">Requests you sent to trainers.</p>
              <div className="mt-3 space-y-3">
                {outgoingRequests.length ? (
                  outgoingRequests.map((request) => {
                    const trainerName = nameByUserId.get(request.trainer_user_id) || `user-${request.trainer_user_id.slice(0, 6)}`;
                    return (
                      <article key={request.id} className="rounded-xl border border-zinc-200 p-3">
                        <p className="text-sm font-medium text-zinc-900">{trainerName}</p>
                        <p className="text-xs text-zinc-600">Status: <span className="uppercase font-medium">{request.status}</span></p>
                        {request.message ? <p className="mt-1 text-xs text-zinc-700">Message: {request.message}</p> : null}
                        {request.status === "pending" ? (
                          <form action={updateHireRequestStatusAction} className="mt-2">
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="nextStatus" value="cancelled" />
                            <PendingSubmitButton
                              className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                              pendingLabel="Cancelling..."
                            >
                              Cancel Request
                            </PendingSubmitButton>
                          </form>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-600">No requests sent yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Incoming Requests</h2>
              <p className="mt-1 text-xs text-zinc-600">Requests sent to you as a trainer.</p>
              <div className="mt-3 space-y-3">
                {isCurrentUserTrainer ? (
                  incomingRequests.length ? (
                    incomingRequests.map((request) => {
                      const clientName = nameByUserId.get(request.client_user_id) || `user-${request.client_user_id.slice(0, 6)}`;
                      return (
                        <article key={request.id} className="rounded-xl border border-zinc-200 p-3">
                          <p className="text-sm font-medium text-zinc-900">{clientName}</p>
                          <p className="text-xs text-zinc-600">Status: <span className="uppercase font-medium">{request.status}</span></p>
                          {request.message ? <p className="mt-1 text-xs text-zinc-700">Message: {request.message}</p> : null}
                          {request.status === "pending" ? (
                            <div className="mt-2 flex gap-2">
                              <form action={updateHireRequestStatusAction}>
                                <input type="hidden" name="requestId" value={request.id} />
                                <input type="hidden" name="nextStatus" value="accepted" />
                                <PendingSubmitButton
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white"
                                  pendingLabel="Accepting..."
                                >
                                  Accept
                                </PendingSubmitButton>
                              </form>
                              <form action={updateHireRequestStatusAction}>
                                <input type="hidden" name="requestId" value={request.id} />
                                <input type="hidden" name="nextStatus" value="rejected" />
                                <PendingSubmitButton
                                  className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-800"
                                  pendingLabel="Rejecting..."
                                >
                                  Reject
                                </PendingSubmitButton>
                              </form>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-zinc-600">No incoming requests yet.</p>
                  )
                ) : (
                  <p className="text-sm text-zinc-600">Enable trainer mode in Profile to receive hire requests.</p>
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

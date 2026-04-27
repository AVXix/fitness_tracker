import { rateTrainerAction, removeHireRequestAction, requestTrainerHireAction, updateHireRequestStatusAction } from "@/app/actions/trainer-actions";
import { AutoDismissAlert } from "@/components/AutoDismissAlert";
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

function renderStars(rating: number) {
  const safe = Math.max(1, Math.min(5, rating));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)}`;
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

  const outgoingRequests = (hireRequests || []).filter((row) => row.client_user_id === user?.id);
  const incomingRequests = (hireRequests || []).filter((row) => row.trainer_user_id === user?.id);
  const outgoingActiveRequests = outgoingRequests.filter((row) => row.status === "pending");
  const outgoingHistoryRequests = outgoingRequests.filter((row) => row.status !== "pending");
  const incomingActiveRequests = incomingRequests.filter((row) => row.status === "pending");
  const incomingHistoryRequests = incomingRequests.filter((row) => row.status !== "pending");
  const outgoingByTrainer = new Map<string, HireRequestRow>();
  for (const row of outgoingActiveRequests) {
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

  const allParticipantIds = [...new Set((hireRequests || []).flatMap((row) => [row.client_user_id, row.trainer_user_id]))];
  const ratingAuthorIds = [...new Set((ratings || []).map((row) => row.user_id))];
  const allKnownUserIds = [...new Set([...allParticipantIds, ...ratingAuthorIds])];

  const { data: userNames } = allKnownUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allKnownUserIds)
        .returns<NameRow[]>()
    : { data: [] as NameRow[] };

  const nameByUserId = new Map<string, string>();
  for (const row of userNames || []) {
    const safe = (row.display_name || "").trim() || `user-${row.id.slice(0, 6)}`;
    nameByUserId.set(row.id, safe);
  }

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
        <AutoDismissAlert
          message={ratingSuccess || trainerSuccess || ""}
          durationMs={3500}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        />
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

                <details className="mt-4 rounded-xl border border-zinc-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50">
                    <span>Reviews &amp; Ratings</span>
                    <span className="text-xs font-normal text-zinc-600">
                      {trainerRatings.length} rating{trainerRatings.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <div className="border-t border-zinc-200 px-3 py-3">
                    {trainerRatings.length ? (
                      <div className="space-y-2">
                        {trainerRatings.map((row, index) => {
                          const reviewerName = nameByUserId.get(row.user_id) || `user-${row.user_id.slice(0, 6)}`;
                          const reviewText = (row.review || "").trim();
                          const isCurrentUserReview = row.user_id === user?.id;
                          return (
                            <article
                              key={`${row.user_id}-${index}`}
                              className={`rounded-lg border p-2.5 text-sm ${
                                isCurrentUserReview
                                  ? "border-emerald-300 bg-emerald-50"
                                  : "border-zinc-200 bg-zinc-50"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-zinc-900">
                                  {reviewerName}
                                  {isCurrentUserReview ? (
                                    <span className="ml-2 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                      You
                                    </span>
                                  ) : null}
                                </p>
                                <p className="font-semibold text-amber-500" aria-label={`${row.rating} out of 5 stars`}>
                                  {renderStars(row.rating)}
                                </p>
                              </div>
                              <p className="mt-1 text-zinc-700">
                                {reviewText || "No written comment."}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600">No ratings yet for this trainer.</p>
                    )}
                  </div>
                </details>

                {user && user.id !== trainer.id ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <details className="rounded-xl border border-zinc-200 bg-white">
                      <summary className="cursor-pointer list-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50">
                        Hire Trainer
                      </summary>
                      {hasPendingHireRequest && myHireRequest ? (
                        <div className="space-y-2 border-t border-zinc-200 p-3">
                          <p className="text-sm text-zinc-700">You already have a pending request for this trainer.</p>
                          <p className="text-xs text-zinc-600">
                            Latest request status: <span className="font-medium uppercase">{myHireRequest.status}</span>
                          </p>
                          <form action={updateHireRequestStatusAction}>
                            <input type="hidden" name="requestId" value={myHireRequest.id} />
                            <input type="hidden" name="nextStatus" value="cancelled" />
                            <PendingSubmitButton
                              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800"
                              pendingLabel="Cancelling..."
                            >
                              Cancel Request
                            </PendingSubmitButton>
                          </form>
                        </div>
                      ) : (
                        <form action={requestTrainerHireAction} className="space-y-2 border-t border-zinc-200 p-3">
                          <input type="hidden" name="trainerUserId" value={trainer.id} />
                          <label htmlFor={`hire-message-${trainer.id}`} className="block text-sm font-medium text-zinc-800">
                            Hire request message
                          </label>
                          <textarea
                            id={`hire-message-${trainer.id}`}
                            name="message"
                            rows={2}
                            placeholder="Hi, I want coaching for strength training."
                            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                          />
                          {myHireRequest ? (
                            <p className="text-xs text-zinc-600">
                              Latest request status: <span className="font-medium uppercase">{myHireRequest.status}</span>
                            </p>
                          ) : null}
                          <PendingSubmitButton
                            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                            pendingLabel="Sending..."
                          >
                            Send Hire Request
                          </PendingSubmitButton>
                        </form>
                      )}
                    </details>

                    <details className="rounded-xl border border-zinc-200 bg-white">
                      <summary className="cursor-pointer list-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50">
                        Rate Trainer
                      </summary>
                      <form action={rateTrainerAction} className="space-y-2 border-t border-zinc-200 p-3">
                        <input type="hidden" name="trainerUserId" value={trainer.id} />
                        <fieldset>
                          <legend className="block text-sm font-medium text-zinc-800">
                            Your rating (used in average)
                          </legend>
                          <p className="mt-1 text-xs text-zinc-500">Click a star from 1 to 5</p>
                          <div className="mt-2 flex flex-row-reverse justify-end gap-1 [&>input]:sr-only [&>label]:cursor-pointer [&>label]:text-3xl [&>label]:leading-none [&>label]:text-zinc-500 [&>label]:transition-colors [&>input:checked~label]:text-amber-500 [&>label:hover]:text-amber-400 [&>label:hover~label]:text-amber-400">
                            {[5, 4, 3, 2, 1].flatMap((value) => [
                              <input
                                key={`rating-input-${value}`}
                                id={`rating-${trainer.id}-${value}`}
                                type="radio"
                                name="rating"
                                value={value}
                                defaultChecked={myRating?.rating === value}
                                required={value === 1}
                              />,
                              <label
                                key={`rating-label-${value}`}
                                htmlFor={`rating-${trainer.id}-${value}`}
                                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                              >
                                ★
                              </label>,
                            ])}
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
                    </details>
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
              <p className="mt-1 text-xs text-zinc-600">Active requests you sent to trainers.</p>
              <div className="mt-3 space-y-3">
                {outgoingActiveRequests.length ? (
                  outgoingActiveRequests.map((request) => {
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
                  <p className="text-sm text-zinc-600">No active requests.</p>
                )}
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-4">
                <h3 className="text-sm font-semibold text-zinc-900">History</h3>
                <p className="mt-1 text-xs text-zinc-600">Accepted, rejected, and cancelled requests.</p>
                <div className="mt-3 space-y-3">
                  {outgoingHistoryRequests.length ? (
                    outgoingHistoryRequests.map((request) => {
                      const trainerName = nameByUserId.get(request.trainer_user_id) || `user-${request.trainer_user_id.slice(0, 6)}`;
                      return (
                        <article key={request.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900">{trainerName}</p>
                            <form action={removeHireRequestAction}>
                              <input type="hidden" name="requestId" value={request.id} />
                              <PendingSubmitButton
                                className="h-6 w-6 rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                                pendingLabel="..."
                              >
                                x
                              </PendingSubmitButton>
                            </form>
                          </div>
                          <p className="text-xs text-zinc-600">Status: <span className="uppercase font-medium">{request.status}</span></p>
                          {request.message ? <p className="mt-1 text-xs text-zinc-700">Message: {request.message}</p> : null}
                        </article>
                      );
                    })
                  ) : (
                    <p className="text-sm text-zinc-600">No history yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-zinc-900">Incoming Requests</h2>
              <p className="mt-1 text-xs text-zinc-600">Active requests sent to you as a trainer.</p>
              <div className="mt-3 space-y-3">
                {isCurrentUserTrainer ? (
                  incomingActiveRequests.length ? (
                    incomingActiveRequests.map((request) => {
                      const clientName = nameByUserId.get(request.client_user_id) || `user-${request.client_user_id.slice(0, 6)}`;
                      return (
                        <article key={request.id} className="rounded-xl border border-zinc-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900">{clientName}</p>
                            <form action={removeHireRequestAction}>
                              <input type="hidden" name="requestId" value={request.id} />
                              <PendingSubmitButton
                                className="h-6 w-6 rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                                pendingLabel="..."
                              >
                                x
                              </PendingSubmitButton>
                            </form>
                          </div>
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
                    <p className="text-sm text-zinc-600">No active incoming requests.</p>
                  )
                ) : (
                  <p className="text-sm text-zinc-600">Enable trainer mode in Profile to receive hire requests.</p>
                )}
              </div>

              {isCurrentUserTrainer ? (
                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <h3 className="text-sm font-semibold text-zinc-900">History</h3>
                  <p className="mt-1 text-xs text-zinc-600">Accepted, rejected, and cancelled requests.</p>
                  <div className="mt-3 space-y-3">
                    {incomingHistoryRequests.length ? (
                      incomingHistoryRequests.map((request) => {
                        const clientName = nameByUserId.get(request.client_user_id) || `user-${request.client_user_id.slice(0, 6)}`;
                        return (
                          <article key={request.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-zinc-900">{clientName}</p>
                              <form action={removeHireRequestAction}>
                                <input type="hidden" name="requestId" value={request.id} />
                                <PendingSubmitButton
                                  className="h-6 w-6 rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                                  pendingLabel="..."
                                >
                                  x
                                </PendingSubmitButton>
                              </form>
                            </div>
                            <p className="text-xs text-zinc-600">Status: <span className="uppercase font-medium">{request.status}</span></p>
                            {request.message ? <p className="mt-1 text-xs text-zinc-700">Message: {request.message}</p> : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="text-sm text-zinc-600">No history yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export function parseOptionalNumber(value: FormDataEntryValue | null) {
  const stringValue = String(value ?? "").trim();

  if (!stringValue) {
    return null;
  }

  const numberValue = Number(stringValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function resolveForumAuthorName(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  user: Awaited<ReturnType<typeof requireUser>>,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  const displayName = String(profile?.display_name ?? "").trim();
  if (displayName) {
    return displayName;
  }

  const metadataName = String(
    user.user_metadata?.display_name ?? user.user_metadata?.name ?? user.user_metadata?.full_name ?? "",
  ).trim();
  if (metadataName) {
    return metadataName;
  }

  const emailPrefix = String(user.email ?? "").split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix;
  }

  return `user-${user.id.slice(0, 6)}`;
}

export function isMissingForumIdentityColumnError(message?: string) {
  const lower = String(message || "").toLowerCase();
  return (
    lower.includes("column") &&
    (lower.includes("author_name") ||
      lower.includes("posted_by") ||
      lower.includes("commente_by") ||
      lower.includes("commented_by"))
  );
}

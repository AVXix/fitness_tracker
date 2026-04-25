/**
 * Ensures required forum_votes table and schema exist in the connected Supabase project.
 * This runs once per app startup and alerts if schema is missing.
 *
 * Note: Automatic schema creation requires running migrations manually in Supabase SQL Editor.
 * This utility validates the schema and provides diagnostics if it's missing.
 */

import { createSupabaseServerClient } from "./server";

let schemaInitialized = false;
let schemaValid = false;
let trainerSchemaInitialized = false;
let trainerSchemaValid = false;

/**
 * Check if forum_votes table exists in the connected Supabase project.
 * Returns true if table exists and is accessible, false otherwise.
 */
async function checkForumVotesTableExists(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return false;
    }

    // Try a minimal query to test if table exists
    const { error } = await supabase.from("forum_votes").select("id").limit(0);

    if (error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("does not exist") || errorMsg.includes("could not find the table")) {
        console.warn("[Forum] forum_votes table not found in Supabase");
        return false;
      }
      // Other error type (permissions, etc) - table likely exists
      console.log("[Forum] forum_votes table exists (permissions OK)");
      return true;
    }

    console.log("[Forum] forum_votes table verified");
    return true;
  } catch (error) {
    console.error("[Forum] Error checking forum_votes table:", error);
    return false;
  }
}

async function checkTrainerRatingsTableExists(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return false;
    }

    const { error } = await supabase.from("trainer_ratings").select("id").limit(0);

    if (error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("does not exist") || errorMsg.includes("could not find the table")) {
        console.warn("[Trainer] trainer_ratings table not found in Supabase");
        return false;
      }
      console.log("[Trainer] trainer_ratings table exists (permissions OK)");
      return true;
    }

    console.log("[Trainer] trainer_ratings table verified");
    return true;
  } catch (error) {
    console.error("[Trainer] Error checking trainer_ratings table:", error);
    return false;
  }
}

/**
 * Ensure forum_votes schema validation passes.
 * Logs diagnostics if schema is missing.
 * Safe to call multiple times (cached result).
 */
export async function ensureForumSchema() {
  // Only check once per process
  if (schemaInitialized) {
    return schemaValid;
  }

  schemaInitialized = true;

  try {
    const tableExists = await checkForumVotesTableExists();

    if (!tableExists) {
      console.warn(
        "\n[FORUM SETUP]\n" +
          "The forum_votes table is not yet created in your Supabase project.\n" +
          "To enable forum voting, run these SQL migrations in your Supabase SQL Editor:\n\n" +
          "1. Open: supabase/migrations/20260424120000_forum_votes_hotfix.sql\n" +
          "   Paste into SQL Editor and click Run\n\n" +
          "2. Open: supabase/migrations/20260424123000_forum_votes_cache_and_grants.sql\n" +
          "   Paste into SQL Editor and click Run\n\n" +
          "Then verify with: select to_regclass('public.forum_votes');\n" +
          "Expected result: public.forum_votes\n"
      );
      schemaValid = false;
      return false;
    }

    schemaValid = true;
    return true;
  } catch (error) {
    console.error("[Forum] Unexpected error during schema check:", error);
    schemaValid = false;
    return false;
  }
}

export async function ensureTrainerSchema() {
  if (trainerSchemaInitialized) {
    return trainerSchemaValid;
  }

  trainerSchemaInitialized = true;

  try {
    const tableExists = await checkTrainerRatingsTableExists();

    if (!tableExists) {
      console.warn(
        "\n[TRAINER SETUP]\n" +
          "The trainer_ratings table is not yet created in your Supabase project.\n" +
          "To enable trainer ratings, run these SQL migrations in Supabase SQL Editor:\n\n" +
          "1. Open: supabase/migrations/20260424195000_profiles_select_authenticated_for_trainers.sql\n" +
          "   Paste into SQL Editor and click Run\n\n" +
          "2. Open: supabase/migrations/20260424174000_trainers_contact_hiring_rating.sql\n" +
          "   Paste into SQL Editor and click Run\n\n" +
          "3. Open: supabase/migrations/20260424193000_trainer_ratings_schema_hardening.sql\n" +
          "   Paste into SQL Editor and click Run\n\n" +
            "4. Open: supabase/migrations/20260424201000_trainer_hire_requests_workflow.sql\n" +
            "   Paste into SQL Editor and click Run\n\n" +
          "Then verify with: select to_regclass('public.trainer_ratings');\n" +
          "Expected result: public.trainer_ratings\n"
      );
      trainerSchemaValid = false;
      return false;
    }

    trainerSchemaValid = true;
    return true;
  } catch (error) {
    console.error("[Trainer] Unexpected error during schema check:", error);
    trainerSchemaValid = false;
    return false;
  }
}

/**
 * Get current schema validation state without re-checking.
 * Useful after initial ensureForumSchema() call.
 */
export function isForumSchemaValid(): boolean {
  return schemaValid;
}

export function isTrainerSchemaValid(): boolean {
  return trainerSchemaValid;
}

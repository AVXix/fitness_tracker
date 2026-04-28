# Fitness Tracker

Maintainer guide for the Next.js + Supabase fitness tracking app.

## Stack

- Next.js App Router (TypeScript)
- React 19
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS

## What the app includes

- Authenticated dashboard and profile
- Goals, weight logs, calorie logs, workouts, exercise logs
- Community forum with post/comment voting
- Trainer discovery, hire requests, and ratings

## Repository structure

- src/app: route handlers, pages, server actions
- src/app/actions: domain-split server action modules
- src/components: UI components
- src/lib: data and integration helpers
- src/lib/supabase: Supabase client/server/env/schema helpers
- supabase/migrations: SQL schema migrations
- docs in root: setup and troubleshooting guides

## Local development

1. Install dependencies:

```bash
npm install
```

2. Add environment variables in .env (or .env.local):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Start dev server:

```bash
npm run dev
```

4. Lint:

```bash
npm run lint
```

# Project Workflow

This project is a Next.js app that uses Supabase for authentication, session handling, and database access.

## 1. Entry Flow

- The main landing page is [src/app/page.tsx](src/app/page.tsx).
- It checks the current session with `getCurrentUser()` from [src/lib/supabase/server.ts](src/lib/supabase/server.ts).
- If a user is signed in, the page shows a link to `/dashboard` and a logout button.
- If no user is signed in, the page shows links to `/login` and `/register`.

## 2. Login And Register Flow

- Login page: [src/app/login/page.tsx](src/app/login/page.tsx)
- Login form: [src/app/login/login-form.tsx](src/app/login/login-form.tsx)
- Register page: [src/app/register/page.tsx](src/app/register/page.tsx)
- Register form: [src/app/register/register-form.tsx](src/app/register/register-form.tsx)

How it works:

- The forms use the browser Supabase client from [src/lib/supabase/client.ts](src/lib/supabase/client.ts).
- Login calls `supabase.auth.signInWithPassword(...)`.
- Register calls `supabase.auth.signUp(...)` and stores the display name in user metadata.
- If login or sign-up creates a session, the app redirects to `/dashboard`.
- If sign-up requires email confirmation, the user sees a confirmation message instead of a redirect.

## 3. Protected App Area

- All authenticated pages live under [src/app/(app)/](src/app/%28app%29).
- The shared authenticated layout is [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx).
- That layout checks `getCurrentUser()`.
- If there is no user, it shows a login-required screen.
- If there is a user, it renders the sidebar and the current page.

The sidebar is defined in [src/components/Sidebar.tsx](src/components/Sidebar.tsx).

Main authenticated routes:

- Dashboard: [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx)
- Workouts: [src/app/(app)/workouts/page.tsx](src/app/(app)/workouts/page.tsx)
- Weight & Calorie Tracker: [src/app/(app)/weight-tracker/page.tsx](src/app/(app)/weight-tracker/page.tsx)
- Goals: [src/app/(app)/goals/page.tsx](src/app/(app)/goals/page.tsx)
- Analytics: [src/app/(app)/analytics/page.tsx](src/app/(app)/analytics/page.tsx)
- Profile: [src/app/(app)/profile/page.tsx](src/app/(app)/profile/page.tsx)
- Trainers: [src/app/(app)/trainers/page.tsx](src/app/(app)/trainers/page.tsx)
- Forum: [src/app/(app)/forum/page.tsx](src/app/(app)/forum/page.tsx)
- Store: [src/app/(app)/store/page.tsx](src/app/(app)/store/page.tsx)

## 4. Database Access Pattern

The shared server Supabase client is created in [src/lib/supabase/server.ts](src/lib/supabase/server.ts).

Important helpers:

- `createSupabaseServerClient()` creates a server client using request cookies.
- `getCurrentUser()` returns the current signed-in user.
- `requireUser()` redirects to `/login` if no user exists.

Most pages fetch data directly on the server using `supabase.from(...).select(...)`.

### Shared dashboard data

- [src/lib/fitness.ts](src/lib/fitness.ts) loads the core fitness data used by multiple pages.
- It reads from tables such as `profiles`, `goals`, `workouts`, `weight_logs`, and `calorie_logs`.
- Dashboard, profile, analytics, and weight tracker pages reuse this loader.

### Page-specific reads

- Dashboard reads the shared fitness dataset in [src/app/(app)/dashboard/page.tsx](src/app/(app)/dashboard/page.tsx).
- Workouts reads `workouts` and `exercise_logs` in [src/app/(app)/workouts/page.tsx](src/app/(app)/workouts/page.tsx).
- Goals reads `goals` in [src/app/(app)/goals/page.tsx](src/app/(app)/goals/page.tsx).
- Analytics reads the shared fitness dataset in [src/app/(app)/analytics/page.tsx](src/app/(app)/analytics/page.tsx).
- Profile reads the current user and shared profile data in [src/app/(app)/profile/page.tsx](src/app/(app)/profile/page.tsx).
- Forum and trainers have their own page-level queries in [src/app/(app)/forum/page.tsx](src/app/(app)/forum/page.tsx) and [src/app/(app)/trainers/page.tsx](src/app/(app)/trainers/page.tsx).

## 5. Write Actions

Server actions are mostly defined in [src/app/actions/profile-actions.ts](src/app/actions/profile-actions.ts).

They handle:

- Saving profile details
- Adding weight logs
- Adding workout entries
- Adding calorie logs

After writes, the actions call `revalidatePath(...)` so affected pages refresh with new data.

Logout is handled by [src/app/auth-actions.ts](src/app/auth-actions.ts).

## 6. Request Flow Summary

1. Open `/`.
2. If signed out, go to `/login` or `/register`.
3. Log in or create an account using Supabase auth.
4. After success, land on `/dashboard`.
5. The authenticated layout in [src/app/(app)/layout.tsx](src/app/(app)/layout.tsx) keeps protected routes behind a session check.
6. Pages pull data from Supabase on the server and update it through server actions.

## 7. Session And Routing Notes

- `middleware.ts` refreshes the Supabase session cookies on requests.
- Most authenticated pages use `getCurrentUser()` or `requireUser()` rather than trusting client state.
- If environment variables are missing, the app shows setup messages instead of failing silently.



## Supabase setup and migration order

Run migrations manually in Supabase SQL Editor in chronological order.

Core product schema:

1. supabase/migrations/20260410150000_fitness_tracker_schema.sql
2. supabase/migrations/20260410173000_expand_product_schema.sql
3. supabase/migrations/20260420_add_calorie_logs.sql
4. supabase/migrations/20260420_add_forum.sql
5. supabase/migrations/20260420_add_forum_functions.sql
6. supabase/migrations/20260420_update_goals.sql
7. supabase/migrations/20260420_update_workouts_for_exercises.sql
8. supabase/migrations/20260420193000_normalize_tracker_log_columns.sql

Forum votes and compatibility patches:

1. supabase/migrations/20260424103000_fix_forum_votes_compat.sql
2. supabase/migrations/20260424113000_forum_votes_rls.sql
3. supabase/migrations/20260424120000_forum_votes_hotfix.sql
4. supabase/migrations/20260424123000_forum_votes_cache_and_grants.sql

Forum author snapshot and profile/trainer patches:

1. supabase/migrations/20260424134500_profiles_select_authenticated_for_forum.sql
2. supabase/migrations/20260424143000_store_forum_author_name_snapshot.sql
3. supabase/migrations/20260424152000_forum_posted_by_commente_by_snapshot.sql
4. supabase/migrations/20260424165000_profiles_is_trainer.sql
5. supabase/migrations/20260424174000_trainers_contact_hiring_rating.sql
6. supabase/migrations/20260424193000_trainer_ratings_schema_hardening.sql

## Schema validation behavior

- Forum schema checks run in forum routes.
- Trainer schema checks run in trainers route.
- Checks are no longer run from the global authenticated layout.
- Missing table warnings point maintainers to migration fixes instead of crashing page rendering.

## Action-layer conventions

Server actions are split by domain under src/app/actions:

- profile-actions.ts
- goal-actions.ts
- forum-actions.ts
- trainer-actions.ts
- exercise-actions.ts
- shared.ts for common helper logic

Compatibility note:

- src/app/fitness-actions.ts remains as a re-export barrel so existing imports continue to work.

## Common troubleshooting

Forum voting fails with missing table error:

- Run forum vote migrations listed above
- Verify with:

```sql
select to_regclass('public.forum_votes') as forum_votes_table;
```

Trainer ratings fail with missing table error:

- Run trainer rating migrations listed above
- Verify with:

```sql
select to_regclass('public.trainer_ratings') as trainer_ratings_table;
```

## Related docs

- FILE_STRUCTURE.md
- SUPABASE_SETUP.md
- FORUM_SETUP.md
- FORUM_VOTES_FIX.md
- REQUIREMENTS.md
- AGENTS.md

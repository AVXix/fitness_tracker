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

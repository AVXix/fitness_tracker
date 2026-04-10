# Supabase Fitness Setup

## What this adds

This project now expects these tables in Supabase:

- `profiles`
- `goals`
- `reminders`
- `calorie_logs`
- `weight_logs`
- `workouts`
- `workout_exercises`
- `exercises`
- `exercise_videos`
- `forum_posts`
- `forum_comments`
- `trainers`
- `trainer_requests`
- `playlists`
- `playlist_exercises`
- `user_workout_videos`
- `analytics_snapshots`
- `store_items`
- `orders`
- `order_items`

Each table is protected with Row Level Security so a logged-in user can only read and write their own rows.

## How the user connection works

1. Supabase Auth creates a user in `auth.users`.
2. The SQL trigger `handle_new_user()` automatically creates a matching row in `public.profiles`.
3. App writes include the logged-in user's ID as `user_id`.
4. RLS policies check `auth.uid()` so users cannot access each other's fitness data.
5. Public catalog-style tables such as `exercises`, `exercise_videos`, `trainers`, and `store_items` are shared reference data.

## Run the migration

Open your Supabase project:

1. Go to `SQL Editor`
2. Open [`supabase/migrations/20260410150000_fitness_tracker_schema.sql`](/home/k/fitnesstracker/supabase/migrations/20260410150000_fitness_tracker_schema.sql)
3. Paste and run it
4. Then open [`supabase/migrations/20260410173000_expand_product_schema.sql`](/home/k/fitnesstracker/supabase/migrations/20260410173000_expand_product_schema.sql)
5. Paste and run that too

After that, the `/profile` page can save:

- profile details
- goals
- weight logs
- workouts

## Why this schema

- `auth.users` is your real user table in Supabase
- `profiles` stores extra personal/fitness data for each auth user
- `goals`, `weight_logs`, `calorie_logs`, and `workouts` cover daily tracking
- `workout_exercises` and `exercises` support detailed workout plans
- `forum_*`, `trainer_*`, `playlists`, and `store_*` support the broader product vision

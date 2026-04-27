# File Structure and Connections

This document explains how the project is organized, what each major area does, and how files connect at runtime.

## Quick assessment

Overall, the structure is good and maintainable:

- Feature routes are grouped under `src/app/(app)`.
- Shared UI is in `src/components`.
- Data access and integration code is in `src/lib`.
- SQL schema changes are isolated in `supabase/migrations`.

Main maintainability caveats:

- Root-level docs are split across multiple files, including a legacy text file named `file structure`.
- Some components still import from the compatibility barrel `src/app/fitness-actions.ts` instead of domain files in `src/app/actions`.

Both caveats are non-blocking, but documenting the flow clearly helps future refactors.

## Top-level layout

- `src/app`:
  - App Router routes, layouts, route-specific server actions, and auth entry points.
- `src/app/(app)`:
  - Auth-protected application pages (dashboard, profile, goals, forum, trainers, store, etc.).
- `src/app/actions`:
  - Domain server action modules (`profile-actions`, `goal-actions`, `forum-actions`, `trainer-actions`, `exercise-actions`, `store-actions`).
- `src/components`:
  - Reusable UI and form components used by route pages.
- `src/lib`:
  - Data/query logic and integration helpers.
  - `src/lib/fitness.ts` is the main dashboard/profile data aggregator.
  - `src/lib/supabase/*` provides server/client auth/database helpers and schema guards.
- `supabase/migrations`:
  - Source of truth for database schema evolution.
- `prisma/migrations`:
  - Legacy migration artifacts.
- `public`:
  - Static assets.

## Runtime connection map

Most requests follow this flow:

1. Route page in `src/app/(app)/**/page.tsx` renders UI.
2. Page imports one or more components from `src/components`.
3. Forms in components call server actions from `src/app/actions/*` (directly or via `src/app/fitness-actions.ts`).
4. Server actions use `src/lib/supabase/server.ts` to authenticate and read/write Postgres.
5. Data-heavy pages also call `src/lib/fitness.ts` or other `src/lib/*` helpers.
6. DB behavior depends on migrations in `supabase/migrations`.

## File-to-file connections (key examples)

### Auth and shell

- `src/app/layout.tsx`:
  - Root HTML and global styles (`src/app/globals.css`).
- `src/app/page.tsx`:
  - Calls `getCurrentUser` from `src/lib/supabase/server.ts`.
  - Uses `logoutAction` from `src/app/auth-actions.ts`.
- `src/app/(app)/layout.tsx`:
  - Protects authenticated routes via `getCurrentUser`.
  - Renders `src/components/Sidebar.tsx`.

### Dashboard and trackers

- `src/app/(app)/dashboard/page.tsx`:
  - Gets data from `src/lib/fitness.ts`.
  - Renders `src/components/Dashboard.tsx`.
- `src/app/(app)/weight-tracker/page.tsx`:
  - Uses `src/components/WeightTracker.tsx` and `src/components/CalorieTracker.tsx`.
  - Uses actions from `src/app/actions/profile-actions.ts`.
- `src/components/Dashboard.tsx`, `src/components/WeightTracker.tsx`, `src/components/CalorieTracker.tsx`:
  - Depend on types from `src/lib/fitness.ts`.

### Goals, workouts, and forum

- `src/app/(app)/goals/page.tsx`:
  - Renders `src/components/GoalsPageContent.tsx`.
- `src/components/GoalsPageContent.tsx`:
  - Composes `src/components/GoalForm.tsx` and `src/components/GoalCard.tsx`.
- `src/components/GoalForm.tsx`:
  - Calls goal actions via `src/app/actions/goal-actions.ts`.

- `src/app/(app)/workouts/page.tsx`:
  - Renders `src/components/ExerciseForm.tsx` and `src/components/ExerciseHistory.tsx`.
- `src/components/ExerciseForm.tsx`:
  - Calls `addExerciseLogAction` via `src/app/actions/exercise-actions.ts`.

- `src/app/(app)/forum/page.tsx` and `src/app/(app)/forum/[postId]/page.tsx`:
  - Use `src/lib/supabase/ensure-schema.ts` to guard forum schema requirements.
  - Render `src/components/ForumPageContent.tsx` and `src/components/ForumPostCard.tsx`.
- `src/components/CreatePostForm.tsx` and `src/components/ForumPostCard.tsx`:
  - Call forum actions via `src/app/actions/forum-actions.ts`.

### Trainers and store

- `src/app/(app)/trainers/page.tsx`:
  - Uses trainer actions via `src/app/actions/trainer-actions.ts`.
  - Uses `src/lib/supabase/ensure-schema.ts` for trainer schema checks.

- `src/app/(app)/store/page.tsx`:
  - Uses `src/components/StorePageContent.tsx`.
  - Loads fallback catalog from `src/data/scraped_products.json`.
  - Normalizes catalog with `src/lib/store/catalog.ts`.
- `src/components/StorePageContent.tsx`:
  - Calls checkout action in `src/app/actions/store-actions.ts`.

## Action module guide

- `src/app/auth-actions.ts`:
  - Authentication actions (currently logout).
- `src/app/actions/profile-actions.ts`:
  - Profile create/update behavior.
- `src/app/actions/goal-actions.ts`:
  - Goal CRUD and progress updates.
- `src/app/actions/exercise-actions.ts`:
  - Workout/exercise logging.
- `src/app/actions/forum-actions.ts`:
  - Forum posts/comments/votes.
- `src/app/actions/trainer-actions.ts`:
  - Trainer requests and ratings.
- `src/app/actions/store-actions.ts`:
  - Checkout/order behavior.
- `src/app/actions/shared.ts`:
  - Shared action helpers and parsing utilities.
- `src/app/fitness-actions.ts`:
  - Compatibility barrel that re-exports domain actions.

## Maintenance conventions

Keep these conventions to preserve readability:

1. Add new feature routes under `src/app/(app)/<feature>/page.tsx` when auth-protected.
2. Put reusable UI in `src/components` and keep route pages thin.
3. Put server actions in `src/app/actions/<domain>-actions.ts`.
4. Keep DB access and transforms in `src/lib/*`.
5. Add schema changes only through new SQL files in `supabase/migrations`.
6. Prefer direct imports from `src/app/actions/*` for new code; keep `src/app/fitness-actions.ts` for backwards compatibility.

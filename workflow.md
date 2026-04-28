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
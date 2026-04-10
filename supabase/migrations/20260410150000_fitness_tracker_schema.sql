create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  age integer,
  height_cm numeric(5,2),
  fitness_level text,
  primary_goal text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_age_positive check (age is null or age >= 13),
  constraint profiles_height_positive check (height_cm is null or height_cm > 0)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  target_value numeric(8,2),
  target_unit text,
  target_date date,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint goals_status_valid check (status in ('active', 'paused', 'completed'))
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  weight_kg numeric(6,2) not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint weight_logs_weight_positive check (weight_kg > 0)
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  workout_on date not null default current_date,
  duration_minutes integer,
  calories_burned integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workouts_duration_positive check (duration_minutes is null or duration_minutes > 0),
  constraint workouts_calories_positive check (calories_burned is null or calories_burned >= 0)
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  duration_seconds integer,
  distance_km numeric(7,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint exercise_logs_sets_positive check (sets is null or sets > 0),
  constraint exercise_logs_reps_positive check (reps is null or reps > 0),
  constraint exercise_logs_weight_positive check (weight_kg is null or weight_kg >= 0),
  constraint exercise_logs_duration_positive check (duration_seconds is null or duration_seconds > 0),
  constraint exercise_logs_distance_positive check (distance_km is null or distance_km >= 0)
);

create index if not exists goals_user_id_created_at_idx on public.goals(user_id, created_at desc);
create index if not exists weight_logs_user_id_logged_on_idx on public.weight_logs(user_id, logged_on desc);
create index if not exists workouts_user_id_workout_on_idx on public.workouts(user_id, workout_on desc);
create index if not exists exercise_logs_user_id_created_at_idx on public.exercise_logs(user_id, created_at desc);
create index if not exists exercise_logs_workout_id_idx on public.exercise_logs(workout_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
before update on public.workouts
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.weight_logs enable row level security;
alter table public.workouts enable row level security;
alter table public.exercise_logs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own"
on public.goals
for select
using (auth.uid() = user_id);

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own"
on public.goals
for insert
with check (auth.uid() = user_id);

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own"
on public.goals
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own"
on public.goals
for delete
using (auth.uid() = user_id);

drop policy if exists "weight_logs_select_own" on public.weight_logs;
create policy "weight_logs_select_own"
on public.weight_logs
for select
using (auth.uid() = user_id);

drop policy if exists "weight_logs_insert_own" on public.weight_logs;
create policy "weight_logs_insert_own"
on public.weight_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "weight_logs_update_own" on public.weight_logs;
create policy "weight_logs_update_own"
on public.weight_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weight_logs_delete_own" on public.weight_logs;
create policy "weight_logs_delete_own"
on public.weight_logs
for delete
using (auth.uid() = user_id);

drop policy if exists "workouts_select_own" on public.workouts;
create policy "workouts_select_own"
on public.workouts
for select
using (auth.uid() = user_id);

drop policy if exists "workouts_insert_own" on public.workouts;
create policy "workouts_insert_own"
on public.workouts
for insert
with check (auth.uid() = user_id);

drop policy if exists "workouts_update_own" on public.workouts;
create policy "workouts_update_own"
on public.workouts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "workouts_delete_own" on public.workouts;
create policy "workouts_delete_own"
on public.workouts
for delete
using (auth.uid() = user_id);

drop policy if exists "exercise_logs_select_own" on public.exercise_logs;
create policy "exercise_logs_select_own"
on public.exercise_logs
for select
using (auth.uid() = user_id);

drop policy if exists "exercise_logs_insert_own" on public.exercise_logs;
create policy "exercise_logs_insert_own"
on public.exercise_logs
for insert
with check (auth.uid() = user_id);

drop policy if exists "exercise_logs_update_own" on public.exercise_logs;
create policy "exercise_logs_update_own"
on public.exercise_logs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "exercise_logs_delete_own" on public.exercise_logs;
create policy "exercise_logs_delete_own"
on public.exercise_logs
for delete
using (auth.uid() = user_id);

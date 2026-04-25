-- Ensure trainer ratings table exists and is linked to user ids correctly.
-- This migration is idempotent and safe to run multiple times.

create table if not exists public.trainer_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null,
  review text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.trainer_ratings
  add column if not exists user_id uuid,
  add column if not exists trainer_user_id uuid,
  add column if not exists rating integer,
  add column if not exists review text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.trainer_ratings
  alter column user_id set not null,
  alter column trainer_user_id set not null,
  alter column rating set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trainer_ratings_rating_valid'
      and conrelid = 'public.trainer_ratings'::regclass
  ) then
    alter table public.trainer_ratings
      add constraint trainer_ratings_rating_valid check (rating between 1 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trainer_ratings_not_self'
      and conrelid = 'public.trainer_ratings'::regclass
  ) then
    alter table public.trainer_ratings
      add constraint trainer_ratings_not_self check (user_id <> trainer_user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'trainer_ratings_user_trainer_unique'
  ) then
    create unique index trainer_ratings_user_trainer_unique
      on public.trainer_ratings(user_id, trainer_user_id);
  end if;
end $$;

create index if not exists trainer_ratings_trainer_idx on public.trainer_ratings(trainer_user_id);
create index if not exists trainer_ratings_user_idx on public.trainer_ratings(user_id);

drop trigger if exists trainer_ratings_set_updated_at on public.trainer_ratings;
create trigger trainer_ratings_set_updated_at
before update on public.trainer_ratings
for each row
execute function public.set_updated_at();

alter table public.trainer_ratings enable row level security;

drop policy if exists "trainer_ratings_select_all" on public.trainer_ratings;
create policy "trainer_ratings_select_all"
on public.trainer_ratings
for select
using (true);

drop policy if exists "trainer_ratings_insert_own" on public.trainer_ratings;
create policy "trainer_ratings_insert_own"
on public.trainer_ratings
for insert
with check (auth.uid() = user_id);

drop policy if exists "trainer_ratings_update_own" on public.trainer_ratings;
create policy "trainer_ratings_update_own"
on public.trainer_ratings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "trainer_ratings_delete_own" on public.trainer_ratings;
create policy "trainer_ratings_delete_own"
on public.trainer_ratings
for delete
using (auth.uid() = user_id);

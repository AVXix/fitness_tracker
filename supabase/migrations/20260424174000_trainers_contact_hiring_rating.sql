-- Trainer profile contact + hire + rating flow

alter table public.profiles
  add column if not exists trainer_contact text;

create table if not exists public.trainer_hire_requests (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint trainer_hire_requests_status_valid check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  constraint trainer_hire_requests_not_self check (client_user_id <> trainer_user_id)
);

create table if not exists public.trainer_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null,
  review text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trainer_ratings_rating_valid check (rating between 1 and 5),
  constraint trainer_ratings_not_self check (user_id <> trainer_user_id),
  unique(user_id, trainer_user_id)
);

create index if not exists trainer_hire_requests_client_idx on public.trainer_hire_requests(client_user_id, created_at desc);
create index if not exists trainer_hire_requests_trainer_idx on public.trainer_hire_requests(trainer_user_id, created_at desc);
create index if not exists trainer_ratings_trainer_idx on public.trainer_ratings(trainer_user_id);
create index if not exists trainer_ratings_user_idx on public.trainer_ratings(user_id);

drop trigger if exists trainer_ratings_set_updated_at on public.trainer_ratings;
create trigger trainer_ratings_set_updated_at
before update on public.trainer_ratings
for each row
execute function public.set_updated_at();

alter table public.trainer_hire_requests enable row level security;
alter table public.trainer_ratings enable row level security;

drop policy if exists "trainer_hire_requests_select_own_or_target" on public.trainer_hire_requests;
create policy "trainer_hire_requests_select_own_or_target"
on public.trainer_hire_requests
for select
using (auth.uid() = client_user_id or auth.uid() = trainer_user_id);

drop policy if exists "trainer_hire_requests_insert_client" on public.trainer_hire_requests;
create policy "trainer_hire_requests_insert_client"
on public.trainer_hire_requests
for insert
with check (auth.uid() = client_user_id);

drop policy if exists "trainer_hire_requests_update_own_or_target" on public.trainer_hire_requests;
create policy "trainer_hire_requests_update_own_or_target"
on public.trainer_hire_requests
for update
using (auth.uid() = client_user_id or auth.uid() = trainer_user_id)
with check (auth.uid() = client_user_id or auth.uid() = trainer_user_id);

drop policy if exists "trainer_hire_requests_delete_client" on public.trainer_hire_requests;
create policy "trainer_hire_requests_delete_client"
on public.trainer_hire_requests
for delete
using (auth.uid() = client_user_id);

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

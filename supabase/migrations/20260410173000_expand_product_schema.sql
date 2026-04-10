create extension if not exists pgcrypto;

-- Supabase auth.users is the canonical USER entity.
-- Everything else references auth.users(id).

alter table public.profiles
  add column if not exists gender text,
  add column if not exists bio text;

alter table public.goals
  add column if not exists goal_type text,
  add column if not exists current_value numeric(8,2),
  add column if not exists end_date date;

update public.goals
set
  goal_type = coalesce(goal_type, category),
  end_date = coalesce(end_date, target_date)
where goal_type is null
   or end_date is null;

alter table public.weight_logs
  add column if not exists log_date date;

update public.weight_logs
set log_date = coalesce(log_date, logged_on)
where log_date is null;

alter table public.weight_logs
  alter column log_date set default current_date;

alter table public.workouts
  add column if not exists workout_date date,
  add column if not exists total_minutes integer;

update public.workouts
set
  workout_date = coalesce(workout_date, workout_on),
  total_minutes = coalesce(total_minutes, duration_minutes)
where workout_date is null
   or total_minutes is null;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  is_done boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calorie_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  consumed_kcal integer not null default 0,
  burned_kcal integer not null default 0,
  net_kcal integer generated always as (consumed_kcal - burned_kcal) stored,
  created_at timestamptz not null default timezone('utc', now()),
  constraint calorie_logs_consumed_nonnegative check (consumed_kcal >= 0),
  constraint calorie_logs_burned_nonnegative check (burned_kcal >= 0)
);

create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialization text,
  experience_years integer,
  rating numeric(3,2),
  created_at timestamptz not null default timezone('utc', now()),
  constraint trainers_experience_nonnegative check (experience_years is null or experience_years >= 0),
  constraint trainers_rating_valid check (rating is null or (rating >= 0 and rating <= 5))
);

create table if not exists public.trainer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid references public.trainers(id) on delete set null,
  request_date timestamptz not null default timezone('utc', now()),
  status text not null default 'pending',
  constraint trainer_requests_status_valid check (status in ('pending', 'accepted', 'rejected', 'cancelled'))
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal_type text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text,
  instructions text,
  benefits text,
  expected_gains text,
  cautions text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  title text not null,
  video_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.playlist_exercises (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  order_no integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_workout_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  trainer_id uuid references public.trainers(id) on delete set null,
  video_url text not null,
  feedback text,
  status text not null default 'submitted',
  uploaded_at timestamptz not null default timezone('utc', now()),
  constraint user_workout_videos_status_valid check (status in ('submitted', 'reviewed', 'approved', 'rejected'))
);

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  bmi numeric(5,2),
  weekly_progress_pct numeric(5,2),
  recommendation text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  sets integer,
  reps integer,
  weight_kg numeric(6,2),
  duration_min integer,
  created_at timestamptz not null default timezone('utc', now()),
  constraint workout_exercises_sets_positive check (sets is null or sets > 0),
  constraint workout_exercises_reps_positive check (reps is null or reps > 0),
  constraint workout_exercises_weight_nonnegative check (weight_kg is null or weight_kg >= 0),
  constraint workout_exercises_duration_positive check (duration_min is null or duration_min > 0)
);

create table if not exists public.store_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  price numeric(10,2) not null,
  stock_qty integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint store_items_price_nonnegative check (price >= 0),
  constraint store_items_stock_nonnegative check (stock_qty >= 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_date timestamptz not null default timezone('utc', now()),
  total_amount numeric(10,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  constraint orders_total_nonnegative check (total_amount >= 0),
  constraint orders_status_valid check (status in ('pending', 'paid', 'shipped', 'cancelled', 'completed'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid not null references public.store_items(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_price_nonnegative check (unit_price >= 0)
);

create index if not exists reminders_user_id_remind_at_idx on public.reminders(user_id, remind_at desc);
create index if not exists calorie_logs_user_id_log_date_idx on public.calorie_logs(user_id, log_date desc);
create index if not exists trainer_requests_user_id_request_date_idx on public.trainer_requests(user_id, request_date desc);
create index if not exists forum_posts_user_id_created_at_idx on public.forum_posts(user_id, created_at desc);
create index if not exists forum_comments_post_id_created_at_idx on public.forum_comments(post_id, created_at asc);
create index if not exists playlists_user_id_created_at_idx on public.playlists(user_id, created_at desc);
create index if not exists user_workout_videos_user_id_uploaded_at_idx on public.user_workout_videos(user_id, uploaded_at desc);
create index if not exists analytics_snapshots_user_id_snapshot_date_idx on public.analytics_snapshots(user_id, snapshot_date desc);
create index if not exists workout_exercises_workout_id_idx on public.workout_exercises(workout_id);
create index if not exists orders_user_id_order_date_idx on public.orders(user_id, order_date desc);

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
before update on public.forum_posts
for each row
execute function public.set_updated_at();

alter table public.reminders enable row level security;
alter table public.calorie_logs enable row level security;
alter table public.trainer_requests enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.playlists enable row level security;
alter table public.user_workout_videos enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders for select using (auth.uid() = user_id);
drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders for insert with check (auth.uid() = user_id);
drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders for delete using (auth.uid() = user_id);

drop policy if exists "calorie_logs_select_own" on public.calorie_logs;
create policy "calorie_logs_select_own" on public.calorie_logs for select using (auth.uid() = user_id);
drop policy if exists "calorie_logs_insert_own" on public.calorie_logs;
create policy "calorie_logs_insert_own" on public.calorie_logs for insert with check (auth.uid() = user_id);
drop policy if exists "calorie_logs_update_own" on public.calorie_logs;
create policy "calorie_logs_update_own" on public.calorie_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "calorie_logs_delete_own" on public.calorie_logs;
create policy "calorie_logs_delete_own" on public.calorie_logs for delete using (auth.uid() = user_id);

drop policy if exists "trainer_requests_select_own" on public.trainer_requests;
create policy "trainer_requests_select_own" on public.trainer_requests for select using (auth.uid() = user_id);
drop policy if exists "trainer_requests_insert_own" on public.trainer_requests;
create policy "trainer_requests_insert_own" on public.trainer_requests for insert with check (auth.uid() = user_id);
drop policy if exists "trainer_requests_update_own" on public.trainer_requests;
create policy "trainer_requests_update_own" on public.trainer_requests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "trainer_requests_delete_own" on public.trainer_requests;
create policy "trainer_requests_delete_own" on public.trainer_requests for delete using (auth.uid() = user_id);

drop policy if exists "forum_posts_select_all" on public.forum_posts;
create policy "forum_posts_select_all" on public.forum_posts for select using (true);
drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own" on public.forum_posts for insert with check (auth.uid() = user_id);
drop policy if exists "forum_posts_update_own" on public.forum_posts;
create policy "forum_posts_update_own" on public.forum_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "forum_posts_delete_own" on public.forum_posts;
create policy "forum_posts_delete_own" on public.forum_posts for delete using (auth.uid() = user_id);

drop policy if exists "forum_comments_select_all" on public.forum_comments;
create policy "forum_comments_select_all" on public.forum_comments for select using (true);
drop policy if exists "forum_comments_insert_own" on public.forum_comments;
create policy "forum_comments_insert_own" on public.forum_comments for insert with check (auth.uid() = user_id);
drop policy if exists "forum_comments_update_own" on public.forum_comments;
create policy "forum_comments_update_own" on public.forum_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "forum_comments_delete_own" on public.forum_comments;
create policy "forum_comments_delete_own" on public.forum_comments for delete using (auth.uid() = user_id);

drop policy if exists "playlists_select_own" on public.playlists;
create policy "playlists_select_own" on public.playlists for select using (auth.uid() = user_id);
drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists for insert with check (auth.uid() = user_id);
drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own" on public.playlists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own" on public.playlists for delete using (auth.uid() = user_id);

drop policy if exists "user_workout_videos_select_own" on public.user_workout_videos;
create policy "user_workout_videos_select_own" on public.user_workout_videos for select using (auth.uid() = user_id);
drop policy if exists "user_workout_videos_insert_own" on public.user_workout_videos;
create policy "user_workout_videos_insert_own" on public.user_workout_videos for insert with check (auth.uid() = user_id);
drop policy if exists "user_workout_videos_update_own" on public.user_workout_videos;
create policy "user_workout_videos_update_own" on public.user_workout_videos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_workout_videos_delete_own" on public.user_workout_videos;
create policy "user_workout_videos_delete_own" on public.user_workout_videos for delete using (auth.uid() = user_id);

drop policy if exists "analytics_snapshots_select_own" on public.analytics_snapshots;
create policy "analytics_snapshots_select_own" on public.analytics_snapshots for select using (auth.uid() = user_id);
drop policy if exists "analytics_snapshots_insert_own" on public.analytics_snapshots;
create policy "analytics_snapshots_insert_own" on public.analytics_snapshots for insert with check (auth.uid() = user_id);
drop policy if exists "analytics_snapshots_update_own" on public.analytics_snapshots;
create policy "analytics_snapshots_update_own" on public.analytics_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "analytics_snapshots_delete_own" on public.analytics_snapshots;
create policy "analytics_snapshots_delete_own" on public.analytics_snapshots for delete using (auth.uid() = user_id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "orders_update_own" on public.orders;
create policy "orders_update_own" on public.orders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "orders_delete_own" on public.orders;
create policy "orders_delete_own" on public.orders for delete using (auth.uid() = user_id);

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_update_own" on public.order_items;
create policy "order_items_update_own"
on public.order_items
for update
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order_items_delete_own" on public.order_items;
create policy "order_items_delete_own"
on public.order_items
for delete
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

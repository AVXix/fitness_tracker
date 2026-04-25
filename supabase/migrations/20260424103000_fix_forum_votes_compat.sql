-- Ensure forum vote schema works for projects that started from older forum tables.

alter table public.forum_posts
  add column if not exists upvotes integer not null default 0,
  add column if not exists downvotes integer not null default 0,
  add column if not exists comment_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.forum_comments
  add column if not exists upvotes integer not null default 0,
  add column if not exists downvotes integer not null default 0,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.forum_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  vote_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint forum_votes_one_target check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint forum_votes_vote_type_valid check (vote_type in ('upvote', 'downvote')),
  unique(user_id, post_id),
  unique(user_id, comment_id)
);

create index if not exists forum_votes_user_id_idx on public.forum_votes(user_id);

create or replace function public.increment_comment_count(target_post_id uuid)
returns void as $$
begin
  update public.forum_posts
  set comment_count = comment_count + 1
  where id = target_post_id;
end;
$$ language plpgsql;

create or replace function public.update_post_votes(
  target_post_id uuid,
  upvote_delta integer,
  downvote_delta integer
)
returns void as $$
begin
  update public.forum_posts
  set
    upvotes = upvotes + upvote_delta,
    downvotes = downvotes + downvote_delta
  where id = target_post_id;
end;
$$ language plpgsql;

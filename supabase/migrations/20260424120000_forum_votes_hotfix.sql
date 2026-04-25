-- Emergency hotfix: create forum_votes table and policies if missing.
-- Safe to run multiple times.

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
create index if not exists forum_votes_post_id_idx on public.forum_votes(post_id);
create index if not exists forum_votes_comment_id_idx on public.forum_votes(comment_id);

alter table public.forum_votes enable row level security;

drop policy if exists "forum_votes_select_all" on public.forum_votes;
create policy "forum_votes_select_all"
on public.forum_votes
for select
using (true);

drop policy if exists "forum_votes_insert_own" on public.forum_votes;
create policy "forum_votes_insert_own"
on public.forum_votes
for insert
with check (auth.uid() = user_id);

drop policy if exists "forum_votes_update_own" on public.forum_votes;
create policy "forum_votes_update_own"
on public.forum_votes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "forum_votes_delete_own" on public.forum_votes;
create policy "forum_votes_delete_own"
on public.forum_votes
for delete
using (auth.uid() = user_id);

-- Hardening patch for persistent PostgREST schema-cache errors on forum_votes.
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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.forum_votes to authenticated;
grant select on table public.forum_votes to anon;

-- Force PostgREST to reload schema cache in the running API process.
notify pgrst, 'reload schema';

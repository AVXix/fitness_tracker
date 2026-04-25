-- Ensure forum_votes is readable/writable by authenticated users for their own votes.

alter table public.forum_votes enable row level security;

-- Read votes for all posts so forum score can be computed.
drop policy if exists "forum_votes_select_all" on public.forum_votes;
create policy "forum_votes_select_all"
on public.forum_votes
for select
using (true);

-- Users can create votes only for themselves.
drop policy if exists "forum_votes_insert_own" on public.forum_votes;
create policy "forum_votes_insert_own"
on public.forum_votes
for insert
with check (auth.uid() = user_id);

-- Users can update/delete only their own votes.
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

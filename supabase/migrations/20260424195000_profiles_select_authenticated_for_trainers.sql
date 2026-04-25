-- Allow authenticated users to discover trainer profiles for hire/rating flows.
-- Safe to run multiple times.

alter table public.profiles enable row level security;

grant select on table public.profiles to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

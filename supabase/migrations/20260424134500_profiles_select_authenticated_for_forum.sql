-- Allow authenticated users to read profile rows so forum can show human-readable author names.
-- Existing "profiles_select_own" remains in place; this adds a broader select policy for signed-in users.

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
using (auth.role() = 'authenticated');

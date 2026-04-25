-- Add trainer flag to profiles so users can self-identify as trainers.

alter table public.profiles
  add column if not exists is_trainer boolean not null default false;

update public.profiles
set is_trainer = false
where is_trainer is null;

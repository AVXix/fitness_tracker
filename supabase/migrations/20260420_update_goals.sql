-- Update goals table to support AI advice

alter table public.goals
add column if not exists ai_advice text,
add column if not exists is_completed boolean default false;

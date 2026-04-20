-- Normalize tracker log schemas across older and newer migrations.
-- This keeps legacy projects (log_date/consumed_kcal) compatible with current app code (logged_on/calories).

alter table if exists public.weight_logs
  add column if not exists log_date date,
  add column if not exists note text;

update public.weight_logs
set log_date = coalesce(log_date, logged_on)
where log_date is null;

alter table if exists public.weight_logs
  alter column log_date set default current_date;

alter table if exists public.calorie_logs
  add column if not exists logged_on date,
  add column if not exists meal_type text,
  add column if not exists food_description text,
  add column if not exists calories integer,
  add column if not exists protein_g numeric(6,2),
  add column if not exists carbs_g numeric(6,2),
  add column if not exists fat_g numeric(6,2),
  add column if not exists note text;

update public.calorie_logs
set logged_on = coalesce(logged_on, log_date)
where logged_on is null;

update public.calorie_logs
set calories = coalesce(calories, consumed_kcal)
where calories is null;

update public.calorie_logs
set meal_type = coalesce(nullif(meal_type, ''), 'other')
where meal_type is null or meal_type = '';

update public.calorie_logs
set food_description = coalesce(nullif(food_description, ''), 'Daily intake')
where food_description is null or food_description = '';

alter table if exists public.calorie_logs
  alter column logged_on set default current_date,
  alter column meal_type set default 'other',
  alter column food_description set default 'Daily intake';

-- Ensure index for calendar/date lookups in the new UI.
create index if not exists calorie_logs_user_id_logged_on_idx
  on public.calorie_logs(user_id, logged_on desc);

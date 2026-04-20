-- Add calorie logs table for tracking daily calorie intake

create table if not exists public.calorie_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  meal_type text not null,
  food_description text not null,
  calories integer not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint calorie_logs_calories_positive check (calories > 0),
  constraint calorie_logs_meal_type_valid check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  constraint calorie_logs_protein_positive check (protein_g is null or protein_g >= 0),
  constraint calorie_logs_carbs_positive check (carbs_g is null or carbs_g >= 0),
  constraint calorie_logs_fat_positive check (fat_g is null or fat_g >= 0)
);

create index if not exists calorie_logs_user_id_logged_on_idx on public.calorie_logs(user_id, logged_on desc);

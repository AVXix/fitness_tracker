-- Update workouts table to support exercise type tracking
alter table public.workouts
add column if not exists workout_type text default 'strength',
add column if not exists category text,
add column if not exists exercises_completed integer default 0;

-- Update exercise_logs to better track individual exercises
alter table public.exercise_logs
add column if not exists exercise_type text,
add column if not exists category text,
add column if not exists muscle_group text,
add column if not exists cardio_intensity text;

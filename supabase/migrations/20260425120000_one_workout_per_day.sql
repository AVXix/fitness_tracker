-- Enforce one workout per user per day and merge duplicate workout rows safely.
-- This migration is defensive: it skips steps when optional tables/columns are absent.

do $$
declare
  day_column text;
begin
  if to_regclass('public.workouts') is null then
    raise notice 'Skipping one-workout-per-day migration: public.workouts does not exist.';
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workouts'
      and column_name = 'workout_on'
  ) then
    day_column := 'workout_on';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workouts'
      and column_name = 'workout_date'
  ) then
    day_column := 'workout_date';
  else
    raise notice 'Skipping one-workout-per-day migration: no workout day column found.';
    return;
  end if;

  if to_regclass('public.exercise_logs') is not null then
    execute format(
      $sql$
      with ranked_workouts as (
        select
          id,
          user_id,
          %1$I as workout_day,
          created_at,
          first_value(id) over (
            partition by user_id, %1$I
            order by created_at asc, id asc
          ) as canonical_id
        from public.workouts
      ), duplicates as (
        select id as duplicate_id, canonical_id
        from ranked_workouts
        where id <> canonical_id
      )
      update public.exercise_logs logs
      set workout_id = dup.canonical_id
      from duplicates dup
      where logs.workout_id = dup.duplicate_id
      $sql$,
      day_column
    );
  else
    raise notice 'public.exercise_logs missing; skipping workout_id reassignment step.';
  end if;

  execute format(
    $sql$
    with ranked_workouts as (
      select
        id,
        user_id,
        %1$I as workout_day,
        created_at,
        first_value(id) over (
          partition by user_id, %1$I
          order by created_at asc, id asc
        ) as canonical_id
      from public.workouts
    )
    delete from public.workouts w
    using ranked_workouts rw
    where w.id = rw.id
      and rw.id <> rw.canonical_id
    $sql$,
    day_column
  );

  execute format(
    'create unique index if not exists workouts_user_day_unique_idx on public.workouts(user_id, %I)',
    day_column
  );
end
$$;

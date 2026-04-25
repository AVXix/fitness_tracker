-- Harden trainer hire request workflow for inbox/status management.
-- Safe to run multiple times.

alter table public.trainer_hire_requests
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by uuid references auth.users(id) on delete set null,
  add column if not exists trainer_response text;

-- Keep one pending request per client/trainer pair by auto-cancelling older duplicates.
with duplicate_pending as (
  select
    id,
    row_number() over (
      partition by client_user_id, trainer_user_id
      order by created_at desc, id desc
    ) as rn
  from public.trainer_hire_requests
  where status = 'pending'
)
update public.trainer_hire_requests r
set
  status = 'cancelled',
  responded_at = coalesce(r.responded_at, timezone('utc', now()))
from duplicate_pending d
where r.id = d.id
  and d.rn > 1;

create unique index if not exists trainer_hire_requests_one_pending_idx
  on public.trainer_hire_requests (client_user_id, trainer_user_id)
  where status = 'pending';

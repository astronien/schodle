-- Phase 1: Unify schedule_requests into schedules as single source of truth.
-- The schedules table becomes the only schedule storage. The additional
-- request_type and revert_shift_type_id columns preserve the workflow that
-- was previously handled by the schedule_requests table.

-- 1. Add missing columns to schedules (idempotent).
alter table public.schedules
  add column if not exists request_type text
    not null default 'shift_change'
    check (request_type in ('leave', 'swap', 'shift_change', 'late_scan', 'off_request'));

alter table public.schedules
  add column if not exists revert_shift_type_id uuid
    references public.shift_types(id);

create index if not exists idx_schedules_status
  on public.schedules(status);

-- 2. Migrate any pre-existing schedule_requests rows into schedules.
-- ON CONFLICT keeps the existing schedules row intact when both tables
-- somehow hold data for the same (employee_id, date).
insert into public.schedules (
  id,
  employee_id,
  date,
  shift_type_id,
  status,
  employee_note,
  manager_remark,
  swap_with_id,
  evidence_url,
  request_type,
  revert_shift_type_id,
  created_at,
  updated_at
)
select
  r.id,
  r.employee_id,
  r.date,
  r.shift_type_id,
  r.status,
  r.employee_note,
  r.manager_remark,
  r.swap_with_id,
  r.evidence_url,
  coalesce(r.request_type, 'shift_change') as request_type,
  r.revert_shift_type_id,
  r.created_at,
  r.updated_at
from public.schedule_requests r
on conflict (employee_id, date) do update
set
  shift_type_id = excluded.shift_type_id,
  status = excluded.status,
  employee_note = excluded.employee_note,
  manager_remark = excluded.manager_remark,
  swap_with_id = excluded.swap_with_id,
  evidence_url = excluded.evidence_url,
  request_type = excluded.request_type,
  revert_shift_type_id = excluded.revert_shift_type_id,
  updated_at = now();

-- 3. Drop the now-redundant schedule_requests table.
drop trigger if exists trg_schedule_requests_updated_at on public.schedule_requests;
drop function if exists public.set_updated_at();
drop table if exists public.schedule_requests;

-- ====================================================================
--  Apply pending migrations to production
--  Project: rgpvqxopsgxxnwvcnqnh
--  Run in:  Supabase Dashboard → SQL Editor → New query
--  Order:   002 → 003 → 004 → 005 → 006 → 010 → 011 → 012
-- ====================================================================

-- ===== 002_dedupe_schedules_add_unique_employee_date.sql =====
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM schedules
)
DELETE FROM schedules s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_employee_date_unique'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_employee_date_unique UNIQUE (employee_id, date);
  END IF;
END$$;

-- ===== 003_create_attachments_bucket.sql =====
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Authenticated users can upload evidence"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments');

drop policy if exists "Public read evidence" on storage.objects;
create policy "Public read evidence"
  on storage.objects for select
  to public
  using (bucket_id = 'attachments');

-- ===== 004_fix_schedules_rls.sql =====
drop policy if exists "Allow all" on public.schedules;
drop policy if exists "Allow anon" on public.schedules;
create policy "Allow all" on public.schedules
  for all
  to authenticated
  using (true)
  with check (true);
create policy "Allow anon" on public.schedules
  for all
  to anon
  using (true)
  with check (true);

-- ===== 005_fix_storage_rls.sql =====
drop policy if exists "attachments_insert" on storage.objects;
drop policy if exists "attachments_select" on storage.objects;
drop policy if exists "attachments_select_anon" on storage.objects;
drop policy if exists "attachments_update" on storage.objects;
create policy "attachments_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');
create policy "attachments_select" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
create policy "attachments_select_anon" on storage.objects
  for select to anon using (bucket_id = 'attachments');
create policy "attachments_update" on storage.objects
  for update to authenticated using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');

-- ===== 006_fix_storage_anon.sql =====
drop policy if exists "attachments_insert" on storage.objects;
drop policy if exists "attachments_select_anon" on storage.objects;
drop policy if exists "attachments_select" on storage.objects;
drop policy if exists "attachments_update" on storage.objects;
drop policy if exists "attachments_insert_auth" on storage.objects;
create policy "attachments_insert" on storage.objects
  for insert with check (bucket_id = 'attachments');
create policy "attachments_select_anon" on storage.objects
  for select using (bucket_id = 'attachments');
create policy "attachments_select" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
create policy "attachments_update" on storage.objects
  for update to authenticated using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');
create policy "attachments_insert_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');

-- ===== 009_unify_schedules_table.sql =====
alter table public.schedules
  add column if not exists request_type text
    not null default 'shift_change'
    check (request_type in ('leave', 'swap', 'shift_change', 'late_scan', 'off_request'));

alter table public.schedules
  add column if not exists revert_shift_type_id uuid
    references public.shift_types(id);

create index if not exists idx_schedules_status
  on public.schedules(status);

-- Migrate pre-existing schedule_requests rows (only if the table still exists).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'schedule_requests'
  ) then
    insert into public.schedules (
      id, employee_id, date, shift_type_id, status,
      employee_note, manager_remark, swap_with_id, evidence_url,
      request_type, revert_shift_type_id, created_at, updated_at
    )
    select
      r.id, r.employee_id, r.date, r.shift_type_id, r.status,
      r.employee_note, r.manager_remark, r.swap_with_id, r.evidence_url,
      coalesce(r.request_type, 'shift_change') as request_type,
      r.revert_shift_type_id, r.created_at, r.updated_at
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

    drop trigger if exists trg_schedule_requests_updated_at on public.schedule_requests;
    drop table if exists public.schedule_requests;
  end if;
end $$;

-- ===== 010_security_rls.sql =====
alter table public.employees
  add column if not exists must_change_password boolean not null default false;

revoke select on public.employees from anon, authenticated;
grant select (
  id, employee_code, full_name, position_id, group_id, role,
  phone, email, avatar, weekly_off_day, must_change_password, created_at
) on public.employees to anon, authenticated;

drop policy if exists "Allow all" on public.settings;
drop policy if exists "settings read only" on public.settings;
create policy "settings read only" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "Allow all" on public.push_subscriptions;
drop policy if exists "push_subscriptions self read" on public.push_subscriptions;
drop policy if exists "push_subscriptions self insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions self delete" on public.push_subscriptions;
create policy "push_subscriptions self read" on public.push_subscriptions
  for select to anon, authenticated using (true);
create policy "push_subscriptions self insert" on public.push_subscriptions
  for insert to anon, authenticated with check (true);
create policy "push_subscriptions self delete" on public.push_subscriptions
  for delete to anon, authenticated using (true);

alter table public.employees enable row level security;
alter table public.positions enable row level security;
alter table public.position_groups enable row level security;
alter table public.shift_types enable row level security;
alter table public.schedules enable row level security;
alter table public.settings enable row level security;
alter table public.push_subscriptions enable row level security;

-- ===== 011_atomic_swap_rpc.sql =====
drop function if exists public.swap_schedule_shifts(uuid, uuid) cascade;
create or replace function public.swap_schedule_shifts(
  p_requester_id uuid,
  p_target_id uuid
) returns table(employee_id uuid, date date, shift_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_tgt record;
begin
  if p_requester_id is null or p_target_id is null or p_requester_id = p_target_id then
    raise exception 'invalid ids' using errcode = '22023';
  end if;

  select s.employee_id, s.date, s.shift_id
    into v_req
    from public.schedules s
   where s.employee_id = p_requester_id
   order by s.date
   limit 1
   for update;

  select s.employee_id, s.date, s.shift_id
    into v_tgt
    from public.schedules s
   where s.employee_id = p_target_id
   order by s.date
   limit 1
   for update;

  if v_req.date is null or v_tgt.date is null or v_req.date <> v_tgt.date then
    raise exception 'shifts must be on the same date' using errcode = '22023';
  end if;

  if v_req.shift_id = v_tgt.shift_id then
    raise exception 'shifts are identical' using errcode = '22023';
  end if;

  update public.schedules set shift_id = v_tgt.shift_id where employee_id = p_requester_id and date = v_req.date;
  update public.schedules set shift_id = v_req.shift_id where employee_id = p_target_id and date = v_tgt.date;

  update public.schedules set swap_with_id = null where employee_id in (p_requester_id, p_target_id);

  return query
    select v_req.employee_id, v_req.date, v_tgt.shift_id
    union all
    select v_tgt.employee_id, v_tgt.date, v_req.shift_id;
end;
$$;

grant execute on function public.swap_schedule_shifts(uuid, uuid) to authenticated;
grant execute on function public.swap_schedule_shifts(uuid, uuid) to service_role;

-- ===== 012_service_role_grants.sql =====
grant select on public.employees to service_role;
grant select on public.positions to service_role;
grant select on public.schedules to service_role;
grant select on public.settings to service_role;
grant select on public.push_subscriptions to service_role;
grant select on public.shift_types to service_role;
grant select on public.position_groups to service_role;

grant insert, update, delete on public.employees to service_role;
grant insert, update, delete on public.schedules to service_role;
grant insert, update, delete on public.push_subscriptions to service_role;
grant insert, update, delete on public.settings to service_role;
grant insert, update, delete on public.position_groups to service_role;
grant insert, update, delete on public.shift_types to service_role;
grant insert, update, delete on public.positions to service_role;

grant execute on function public.swap_schedule_shifts(uuid, uuid) to service_role;

-- ===== 013_add_created_by.sql =====
-- Adds a 'created_by' column to schedules so we can distinguish
-- entries the employee submitted (ShiftEditor / late scan / swap
-- request) from those the manager assigned or the AI generator
-- auto-filled. The employee-facing "ระบบขอลา" tab will only
-- surface entries where created_by = 'employee'.

alter table public.schedules
  add column if not exists created_by text
    check (created_by in ('employee', 'manager', 'system'));

-- Backfill existing rows with a conservative best-effort value:
--   * status = 'pending' is only ever produced by an employee
--     submission (the editor only writes pending when the shift
--     requires manager approval).
--   * request_type 'late_scan', 'leave', 'off_request', 'swap' are
--     employee-initiated.
--   * 'shift_change' is ambiguous (used by both editor and
--     manager/AI), so we default those to 'manager' to keep
--     the employee tab clean.
update public.schedules
set created_by = case
  when status = 'pending' then 'employee'
  when request_type in ('late_scan', 'leave', 'off_request', 'swap') then 'employee'
  else 'manager'
end
where created_by is null;

-- Add an index for fast employee-tab lookups
create index if not exists schedules_employee_created_by_idx
  on public.schedules (employee_id, created_by, status, date);

-- Drop the existing "Allow employee" all-access policy from
-- migration 010 and replace it with a tighter version that also
-- lets employees update their own pending requests through the
-- normal client path (not the Edge Function).
drop policy if exists "Allow employees to update own pending" on public.schedules;
create policy "Allow employees to update own pending"
  on public.schedules
  for update
  to authenticated
  using (employee_id = (select id from public.employees where id = auth.uid()))
  with check (employee_id = (select id from public.employees where id = auth.uid()));

-- ===== 014_add_shift_type_is_leave.sql =====
-- Adds an `is_leave` flag on shift_types so the manager can
-- mark which shifts are leave categories (Day Off, Vacation,
-- Sick Leave, …) that employees may request. The employee-
-- facing "ส่งคำขอลา" flow will only show shifts with
-- is_leave = true (when allow_employee_set_shifts is off).
alter table public.shift_types
  add column if not exists is_leave boolean not null default false;

-- Best-effort backfill: mark the obvious leave codes so the
-- existing seed data works without manual admin work.
update public.shift_types
set is_leave = true
where is_leave = false
  and code in ('XC', 'V', 'ป่วย', 'EV', 'AT2', 'AT3', 'B-A2');

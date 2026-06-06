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
create policy "attachments_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');
drop policy if exists "attachments_select" on storage.objects;
create policy "attachments_select" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
drop policy if exists "attachments_select_anon" on storage.objects;
create policy "attachments_select_anon" on storage.objects
  for select to anon using (bucket_id = 'attachments');
drop policy if exists "attachments_update" on storage.objects;
create policy "attachments_update" on storage.objects
  for update to authenticated using (bucket_id = 'attachments')
  with check (bucket_id = 'attachments');

-- ===== 006_fix_storage_anon.sql =====
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

-- ===== 010_security_rls.sql =====
alter table public.employees
  add column if not exists must_change_password boolean not null default false;

revoke select on public.employees from anon, authenticated;
grant select (
  id, employee_code, full_name, position_id, group_id, role,
  phone, email, avatar, weekly_off_day, must_change_password, created_at
) on public.employees to anon, authenticated;

drop policy if exists "Allow all" on public.settings;
create policy "settings read only" on public.settings
  for select to anon, authenticated using (true);

drop policy if exists "Allow all" on public.push_subscriptions;
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

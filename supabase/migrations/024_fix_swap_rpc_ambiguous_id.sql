-- Fix "column reference \"id\" is ambiguous" in swap_schedule_shifts.
--
-- Root cause: the function is declared RETURNS TABLE (id uuid, employee_id
-- uuid, date text, shift_type_id uuid, status text, swap_with_id uuid).
-- In PL/pgSQL those OUT column names become *variables* in the function's
-- scope, so every unqualified `id` inside the body is ambiguous between the
-- OUT variable and public.schedules.id. Postgres raises 42702 at runtime,
-- which surfaced in the app as "ทำรายการไม่สำเร็จ" when a manager approved
-- a swap request.
--
-- Fix: qualify every column reference with a table alias, and add
-- `#variable_conflict use_column` as a belt-and-braces default.

drop function if exists public.swap_schedule_shifts(uuid, uuid) cascade;

create or replace function public.swap_schedule_shifts(
  p_requester_id uuid,
  p_target_id uuid
)
returns table (
  id uuid,
  employee_id uuid,
  date text,
  shift_type_id uuid,
  status text,
  swap_with_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_requester public.schedules%rowtype;
  v_target public.schedules%rowtype;
  v_requester_shift uuid;
  v_target_shift uuid;
begin
  select s.* into v_requester
    from public.schedules s
    where s.id = p_requester_id
    for update;
  if not found then
    raise exception 'ไม่พบตารางเวรของผู้ขอสลับ' using errcode = 'P0001';
  end if;

  select s.* into v_target
    from public.schedules s
    where s.id = p_target_id
    for update;
  if not found then
    raise exception 'ไม่พบตารางเวรของคู่สลับ' using errcode = 'P0001';
  end if;

  if v_requester.date <> v_target.date then
    raise exception 'วันที่ของทั้งสองรายการต้องตรงกัน' using errcode = 'P0001';
  end if;

  if v_requester.shift_type_id = v_target.shift_type_id then
    raise exception 'กะของทั้งสองคนเหมือนกันอยู่แล้ว' using errcode = 'P0001';
  end if;

  v_requester_shift := v_requester.shift_type_id;
  v_target_shift := v_target.shift_type_id;

  update public.schedules s
    set shift_type_id = v_target_shift,
        swap_with_id = null,
        status = 'approved'
    where s.id = p_requester_id;

  update public.schedules s
    set shift_type_id = v_requester_shift,
        swap_with_id = null,
        status = 'approved'
    where s.id = p_target_id;

  return query
    select s.id, s.employee_id, s.date::text, s.shift_type_id, s.status::text, s.swap_with_id
    from public.schedules s
    where s.id in (p_requester_id, p_target_id);
end;
$$;

revoke all on function public.swap_schedule_shifts(uuid, uuid) from public;
grant execute on function public.swap_schedule_shifts(uuid, uuid) to authenticated;
grant execute on function public.swap_schedule_shifts(uuid, uuid) to service_role;

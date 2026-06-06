-- Phase 8 fix: Edge Functions running as service_role lost SELECT access
-- on public.employees after migration 010 revoked + re-granted column-level
-- SELECT to anon, authenticated only. service_role was implicitly
-- inheriting the GRANT, but Supabase's PostgREST changes the requesting
-- role based on the JWT, so the function's "select password_hash" now
-- fails with 500 (lookupError).
--
-- Fix: explicitly grant service_role SELECT on the full row (including
-- password_hash) and ensure RLS bypass is in effect.

-- 1. Service role needs full table-level SELECT (RLS bypasses when
--    request.auth.role() = 'service_role').
grant select on public.employees to service_role;
grant select on public.positions to service_role;
grant select on public.schedules to service_role;
grant select on public.settings to service_role;
grant select on public.push_subscriptions to service_role;
grant select on public.shift_types to service_role;
grant select on public.position_groups to service_role;

-- 2. Edge Functions also need write access to mutate data on behalf of
--    authenticated users (e.g. create-employee, change-password,
--    swap-schedule-shifts, send-push). service_role already inherits
--    these from the schema.sql default, but be explicit.
grant insert, update, delete on public.employees to service_role;
grant insert, update, delete on public.schedules to service_role;
grant insert, update, delete on public.push_subscriptions to service_role;
grant insert, update, delete on public.settings to service_role;
grant insert, update, delete on public.position_groups to service_role;
grant insert, update, delete on public.shift_types to service_role;
grant insert, update, delete on public.positions to service_role;

-- 3. Atomic swap RPC grant (migration 011 must be applied first).
--    Wrapped in DO block to keep this migration idempotent and
--    runnable before 011 if you split the rollout.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public' and p.proname = 'swap_schedule_shifts'
  ) then
    grant execute on function public.swap_schedule_shifts(uuid, uuid) to service_role;
  end if;
end $$;

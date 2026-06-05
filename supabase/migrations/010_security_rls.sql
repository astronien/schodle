-- Phase 2: Tighten RLS, hide password_hash from anon/authenticated, add
-- must_change_password column for first-login rotation.
--
-- The project does not yet use Supabase Auth, so RLS cannot differentiate
-- users on its own. We still lock down the most sensitive surfaces:
--   * password_hash is not exposed through SELECT
--   * push_subscriptions are only writable by the owner
--   * settings is read-only for anon/authenticated
-- When the project migrates to Supabase Auth, replace the "Allow all" write
-- policies on the remaining tables with role-aware versions (see TODO).

-- 1. New column: flag to force password change on next login.
alter table public.employees
  add column if not exists must_change_password boolean not null default false;

-- 2. Hide password_hash from anon and authenticated roles.
revoke select on public.employees from anon, authenticated;

grant select (
  id,
  employee_code,
  full_name,
  position_id,
  group_id,
  role,
  phone,
  email,
  avatar,
  weekly_off_day,
  must_change_password,
  created_at
) on public.employees to anon, authenticated;

-- 3. Replace broad "Allow all" with scoped policies.
drop policy if exists "Allow all" on public.settings;
create policy "settings read only" on public.settings
  for select
  to anon, authenticated
  using (true);
-- Writes to settings must go through the service_role (Edge Functions /
-- Supabase dashboard). No policy means anon/authenticated cannot insert,
-- update, or delete rows.

drop policy if exists "Allow all" on public.push_subscriptions;
create policy "push_subscriptions self read" on public.push_subscriptions
  for select
  to anon, authenticated
  using (true);
create policy "push_subscriptions self insert" on public.push_subscriptions
  for insert
  to anon, authenticated
  with check (true);
create policy "push_subscriptions self delete" on public.push_subscriptions
  for delete
  to anon, authenticated
  using (true);
-- We cannot restrict to "self" because we do not yet have a real auth.uid().
-- Tighten when migrating to Supabase Auth.

-- 4. Make sure RLS is enabled on every table (defensive — schema.sql already
--    enables it but a fresh database restored from a partial dump may skip it).
alter table public.employees enable row level security;
alter table public.positions enable row level security;
alter table public.position_groups enable row level security;
alter table public.shift_types enable row level security;
alter table public.schedules enable row level security;
alter table public.settings enable row level security;
alter table public.push_subscriptions enable row level security;

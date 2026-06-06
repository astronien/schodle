-- Migration 015: Add UPDATE policy for push_subscriptions
-- Required because subscribeToNotifications() uses upsert with
-- onConflict: 'employee_id, subscription'. When the browser returns
-- the same PushSubscription on a re-subscribe, PostgreSQL converts
-- the INSERT into an UPDATE, which needs an UPDATE RLS policy.
-- Without this, the upsert fails with:
--   "new row violates row-level security policy (USING expression)
--    for table 'push_subscriptions'"

drop policy if exists "push_subscriptions self update" on public.push_subscriptions;
create policy "push_subscriptions self update" on public.push_subscriptions
  for update
  to anon, authenticated
  using (true)
  with check (true);

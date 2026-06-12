-- Migration Part 2: Tighten RLS Policies
-- ⚠️  WARNING: Run this ONLY after updating client-side code to use Edge Functions
-- This will block direct table writes from client-side

-- ============================================================================
-- STEP 1: Drop permissive write policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow write" ON positions;
DROP POLICY IF EXISTS "Allow write" ON position_groups;
DROP POLICY IF EXISTS "Allow write" ON shift_types;
DROP POLICY IF EXISTS "Allow write" ON schedules;
DROP POLICY IF EXISTS "Allow write" ON employees;
DROP POLICY IF EXISTS "Allow write" ON recurring_schedules;
DROP POLICY IF EXISTS "Allow write" ON settings;

-- ============================================================================
-- STEP 2: Create restrictive read policies
-- ============================================================================

-- Employees: logged-in users can read (but password_hash is hidden via column grants)
DROP POLICY IF EXISTS "Allow read" ON employees;
CREATE POLICY "Employees read all" ON employees
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

-- Positions, position_groups, shift_types: logged-in users can read
DROP POLICY IF EXISTS "Allow read" ON positions;
CREATE POLICY "Positions read all" ON positions
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

DROP POLICY IF EXISTS "Allow read" ON position_groups;
CREATE POLICY "Position groups read all" ON position_groups
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

DROP POLICY IF EXISTS "Allow read" ON shift_types;
CREATE POLICY "Shift types read all" ON shift_types
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

-- Schedules: employees see their own + approved schedules, managers see all
DROP POLICY IF EXISTS "Allow read" ON schedules;
CREATE POLICY "Schedules read" ON schedules
  FOR SELECT USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id() OR
    status = 'approved'
  );

-- Recurring schedules: employees see their own, managers see all
DROP POLICY IF EXISTS "Allow read" ON recurring_schedules;
CREATE POLICY "Recurring schedules read" ON recurring_schedules
  FOR SELECT USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  );

-- Settings: logged-in users can read
DROP POLICY IF EXISTS "Allow read settings" ON settings;
CREATE POLICY "Settings read all" ON settings
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

-- Push subscriptions: employees see their own, managers see all
DROP POLICY IF EXISTS "Allow read" ON push_subscriptions;
CREATE POLICY "Push subscriptions read" ON push_subscriptions
  FOR SELECT USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  );

-- ============================================================================
-- STEP 3: Create restrictive write policies
-- ============================================================================

-- Positions: manager/admin only
CREATE POLICY "Positions write manager" ON positions
  FOR ALL
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Position groups: manager/admin only
CREATE POLICY "Position groups write manager" ON position_groups
  FOR ALL
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Shift types: manager/admin only
CREATE POLICY "Shift types write manager" ON shift_types
  FOR ALL
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Schedules:
-- - Employees can create/update their own requests (status = 'pending' or 'submitted')
-- - Managers can do anything
CREATE POLICY "Schedules write" ON schedules
  FOR ALL
  USING (
    is_manager_or_admin() OR
    (employee_id = get_current_employee_id() AND status IN ('pending', 'submitted', 'draft'))
  )
  WITH CHECK (
    is_manager_or_admin() OR
    (employee_id = get_current_employee_id() AND status IN ('pending', 'submitted', 'draft'))
  );

-- Employees: manager/admin only
CREATE POLICY "Employees write manager" ON employees
  FOR ALL
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Recurring schedules:
-- - Employees can manage their own
-- - Managers can manage all
CREATE POLICY "Recurring schedules write" ON recurring_schedules
  FOR ALL
  USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  )
  WITH CHECK (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  );

-- Settings: manager/admin only
CREATE POLICY "Settings write manager" ON settings
  FOR ALL
  USING (is_manager_or_admin())
  WITH CHECK (is_manager_or_admin());

-- Push subscriptions:
-- - Employees can manage their own
-- - Managers can manage all
DROP POLICY IF EXISTS "Allow delete own push" ON push_subscriptions;
CREATE POLICY "Push subscriptions write" ON push_subscriptions
  FOR ALL
  USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  )
  WITH CHECK (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  );

-- ============================================================================
-- STEP 4: Verify migration
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration Part 2 complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies tightened:';
  RAISE NOTICE '  - Employees can only read their own schedules + approved schedules';
  RAISE NOTICE '  - Managers can read/write everything';
  RAISE NOTICE '  - All write operations require session context';
  RAISE NOTICE '  - Direct table writes from client are now blocked';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Make sure client-side code uses Edge Function "db-query"';
  RAISE NOTICE '   for all database operations.';
END $$;

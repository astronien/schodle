-- Migration: Tighten RLS Policies
-- Problem: Current policies allow ANYONE to write to all tables
-- Solution: Use RPC functions with session verification for write operations

-- ============================================================================
-- STEP 1: Create helper functions to get current user context
-- ============================================================================

-- Function to get current employee_id from session config
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_employee_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current role from session config
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS text AS $$
BEGIN
  RETURN current_setting('app.current_role', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is manager or admin
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS boolean AS $$
DECLARE
  emp_id uuid;
  emp_role text;
  pos_code text;
BEGIN
  emp_id := get_current_employee_id();
  IF emp_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, p.code INTO emp_role, pos_code
  FROM employees e
  LEFT JOIN positions p ON e.position_id = p.id
  WHERE e.id = emp_id;

  RETURN emp_role IN ('manager', 'admin') OR pos_code IN ('BSM', 'ABSM');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Drop permissive write policies
-- ============================================================================

DROP POLICY IF EXISTS "Allow write" ON positions;
DROP POLICY IF EXISTS "Allow write" ON position_groups;
DROP POLICY IF EXISTS "Allow write" ON shift_types;
DROP POLICY IF EXISTS "Allow write" ON schedules;
DROP POLICY IF EXISTS "Allow write" ON employees;
DROP POLICY IF EXISTS "Allow write" ON recurring_schedules;
DROP POLICY IF EXISTS "Allow write" ON settings;

-- ============================================================================
-- STEP 3: Create restrictive read policies
-- ============================================================================

-- Employees: everyone can read (but password_hash is hidden via column grants)
DROP POLICY IF EXISTS "Allow read" ON employees;
CREATE POLICY "Employees read all" ON employees
  FOR SELECT USING (get_current_employee_id() IS NOT NULL);

-- Positions, position_groups, shift_types: everyone can read
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

-- Settings: everyone can read
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
-- STEP 4: Create RPC functions for write operations
-- ============================================================================

-- Helper function to set session context (called by Edge Functions)
CREATE OR REPLACE FUNCTION set_session_context(p_employee_id uuid, p_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_employee_id', p_employee_id::text, true);
  PERFORM set_config('app.current_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create write policies based on session context
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

-- Employees: manager/admin only (except self-update for password change)
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
-- STEP 6: Create RPC wrapper functions for common operations
-- ============================================================================

-- Upsert schedule (used by both employees and managers)
CREATE OR REPLACE FUNCTION upsert_schedule(
  p_id uuid,
  p_employee_id uuid,
  p_date text,
  p_shift_type_id uuid,
  p_status text,
  p_request_type text DEFAULT 'shift_change',
  p_employee_note text DEFAULT NULL,
  p_manager_remark text DEFAULT NULL,
  p_swap_with_id uuid DEFAULT NULL,
  p_evidence_url text DEFAULT NULL,
  p_revert_shift_type_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_result_id uuid;
BEGIN
  -- Verify permissions
  IF NOT (is_manager_or_admin() OR (p_employee_id = get_current_employee_id() AND p_status IN ('pending', 'submitted', 'draft'))) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO schedules (
    id, employee_id, date, shift_type_id, status, request_type,
    employee_note, manager_remark, swap_with_id, evidence_url, revert_shift_type_id
  )
  VALUES (
    p_id, p_employee_id, p_date, p_shift_type_id, p_status, p_request_type,
    p_employee_note, p_manager_remark, p_swap_with_id, p_evidence_url, p_revert_shift_type_id
  )
  ON CONFLICT (id) DO UPDATE SET
    employee_id = EXCLUDED.employee_id,
    date = EXCLUDED.date,
    shift_type_id = EXCLUDED.shift_type_id,
    status = EXCLUDED.status,
    request_type = EXCLUDED.request_type,
    employee_note = EXCLUDED.employee_note,
    manager_remark = EXCLUDED.manager_remark,
    swap_with_id = EXCLUDED.swap_with_id,
    evidence_url = EXCLUDED.evidence_url,
    revert_shift_type_id = EXCLUDED.revert_shift_type_id,
    updated_at = now()
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk insert schedules (manager only)
CREATE OR REPLACE FUNCTION bulk_insert_schedules(p_schedules jsonb)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO schedules (
    id, employee_id, date, shift_type_id, status, request_type,
    employee_note, manager_remark, swap_with_id, evidence_url, revert_shift_type_id
  )
  SELECT
    (s->>'id')::uuid,
    (s->>'employee_id')::uuid,
    s->>'date',
    (s->>'shift_type_id')::uuid,
    s->>'status',
    COALESCE(s->>'request_type', 'shift_change'),
    s->>'employee_note',
    s->>'manager_remark',
    (s->>'swap_with_id')::uuid,
    s->>'evidence_url',
    (s->>'revert_shift_type_id')::uuid
  FROM jsonb_array_elements(p_schedules) AS s
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete schedule
CREATE OR REPLACE FUNCTION delete_schedule(p_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM schedules WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert settings (manager only)
CREATE OR REPLACE FUNCTION upsert_settings(p_settings jsonb)
RETURNS void AS $$
BEGIN
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  INSERT INTO settings (key, value)
  SELECT key, value
  FROM jsonb_each_text(p_settings)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

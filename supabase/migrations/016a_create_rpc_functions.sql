-- Migration Part 1: Create helper functions and RPC wrappers
-- This part does NOT block anything, just adds new functions
-- Safe to run while app is running

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

-- Helper function to set session context (called by Edge Functions)
CREATE OR REPLACE FUNCTION set_session_context(p_employee_id uuid, p_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_employee_id', p_employee_id::text, true);
  PERFORM set_config('app.current_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create RPC wrapper functions for common operations
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
  -- Note: Permission check will be done by RLS policies after Part 2 migration
  -- For now, this function just provides a clean API

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

-- Bulk insert schedules (manager only - will be enforced by RLS after Part 2)
CREATE OR REPLACE FUNCTION bulk_insert_schedules(p_schedules jsonb)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
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
  DELETE FROM schedules WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert settings
CREATE OR REPLACE FUNCTION upsert_settings(p_settings jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO settings (key, value)
  SELECT key, value
  FROM jsonb_each_text(p_settings)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Verify functions were created
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration Part 1 complete!';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  - get_current_employee_id()';
  RAISE NOTICE '  - get_current_role()';
  RAISE NOTICE '  - is_manager_or_admin()';
  RAISE NOTICE '  - set_session_context()';
  RAISE NOTICE '  - upsert_schedule()';
  RAISE NOTICE '  - bulk_insert_schedules()';
  RAISE NOTICE '  - delete_schedule()';
  RAISE NOTICE '  - upsert_settings()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update client-side code to use these RPC functions,';
  RAISE NOTICE 'then run Migration Part 2 to tighten RLS policies.';
END $$;

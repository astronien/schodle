-- Migration: Add schedule confirmation tracking
-- Employees confirm they have seen the published schedule

-- ============================================================================
-- STEP 1: Create schedule_confirmations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS schedule_confirmations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month_key text NOT NULL,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month_key)
);

COMMENT ON TABLE schedule_confirmations IS 'ตารางยืนยันการเห็นตารางงานของพนักงาน';
COMMENT ON COLUMN schedule_confirmations.month_key IS 'คีย์เดือน รูปแบบ YYYY-MM';

-- ============================================================================
-- STEP 2: RLS
-- ============================================================================

ALTER TABLE schedule_confirmations ENABLE ROW LEVEL SECURITY;

-- Employees can read their own confirmations
CREATE POLICY "Employees can read own confirmations"
  ON schedule_confirmations FOR SELECT
  USING (employee_id = current_setting('app.current_employee_id', true)::uuid);

-- Employees can upsert their own confirmations
CREATE POLICY "Employees can insert own confirmations"
  ON schedule_confirmations FOR INSERT
  WITH CHECK (employee_id = current_setting('app.current_employee_id', true)::uuid);

-- Managers can read all confirmations
CREATE POLICY "Managers can read all confirmations"
  ON schedule_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.id = current_setting('app.current_employee_id', true)::uuid
      AND (e.role IN ('manager', 'admin') OR p.code IN ('BSM', 'ABSM'))
    )
  );

-- ============================================================================
-- STEP 3: RPC functions (accept employee_id explicitly since session
--          context may not be set when called from client directly)
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_schedule(
  p_month_key text,
  p_employee_id uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  v_employee_id := COALESCE(p_employee_id, current_setting('app.current_employee_id', true)::uuid);
  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Cannot identify user';
  END IF;
  INSERT INTO schedule_confirmations (employee_id, month_key, confirmed_at)
  VALUES (v_employee_id, p_month_key, now())
  ON CONFLICT (employee_id, month_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_schedule_confirmations(p_month_key text)
RETURNS TABLE (
  employee_id uuid,
  confirmed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT sc.employee_id, sc.confirmed_at
  FROM schedule_confirmations sc
  WHERE sc.month_key = p_month_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_confirmation(
  p_month_key text,
  p_employee_id uuid DEFAULT NULL
)
RETURNS TABLE (confirmed_at timestamptz) AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  v_employee_id := COALESCE(p_employee_id, current_setting('app.current_employee_id', true)::uuid);
  RETURN QUERY
  SELECT sc.confirmed_at
  FROM schedule_confirmations sc
  WHERE sc.employee_id = v_employee_id AND sc.month_key = p_month_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION confirm_schedule(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_schedule(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_schedule_confirmations(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_confirmation(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_confirmation(text) TO authenticated;

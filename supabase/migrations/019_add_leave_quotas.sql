-- Migration: Add annual leave quotas and balance tracking
-- Adds annual_quota to shift_types and a function to compute used days

-- ============================================================================
-- STEP 0: Create prerequisite helper functions (idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_employee_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
-- STEP 1: Add annual_quota column to shift_types
-- ============================================================================

ALTER TABLE shift_types ADD COLUMN IF NOT EXISTS annual_quota integer;

COMMENT ON COLUMN shift_types.annual_quota IS 'จำนวนวันลาสูงสุดต่อปี (เฉพาะประเภท isLeave = true)';

-- ============================================================================
-- STEP 2: Create function to get leave balance for an employee/year
-- ============================================================================

CREATE OR REPLACE FUNCTION get_leave_balance(
  p_employee_id uuid DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS TABLE (
  shift_type_id uuid,
  code text,
  name text,
  annual_quota integer,
  used_days integer,
  remaining_days integer
) AS $$
DECLARE
  v_employee_id uuid;
  v_year integer;
BEGIN
  -- Resolve parameters
  v_employee_id := COALESCE(p_employee_id, get_current_employee_id());
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::integer);

  -- Only managers can query other employees
  IF p_employee_id IS NOT NULL AND p_employee_id != get_current_employee_id() AND NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    st.id,
    st.code,
    st.name,
    st.annual_quota,
    COALESCE(used.used_days, 0)::integer AS used_days,
    GREATEST(st.annual_quota - COALESCE(used.used_days, 0), 0)::integer AS remaining_days
  FROM shift_types st
  LEFT JOIN (
    SELECT
      s.shift_type_id,
      COUNT(DISTINCT s.date)::integer AS used_days
    FROM schedules s
    WHERE s.employee_id = v_employee_id
      AND s.status = 'approved'
      AND EXTRACT(YEAR FROM s.date::date) = v_year
      AND s.shift_type_id IN (SELECT id FROM shift_types WHERE is_leave = true)
    GROUP BY s.shift_type_id
  ) used ON used.shift_type_id = st.id
  WHERE st.is_leave = true
    AND st.annual_quota IS NOT NULL
  ORDER BY st.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create RPC wrapper for client access
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_leave_balance(p_year integer DEFAULT NULL)
RETURNS TABLE (
  shift_type_id uuid,
  code text,
  name text,
  annual_quota integer,
  used_days integer,
  remaining_days integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_leave_balance(get_current_employee_id(), p_year);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

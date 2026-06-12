-- Migration: Add schedule_templates table
-- Moves schedule templates from localStorage to database

-- ============================================================================
-- STEP 0: Create prerequisite helper functions (idempotent — safe to re-run)
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

CREATE OR REPLACE FUNCTION get_current_role()
RETURNS text AS $$
BEGIN
  RETURN current_setting('app.current_role', true);
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

CREATE OR REPLACE FUNCTION set_session_context(p_employee_id uuid, p_role text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_employee_id', p_employee_id::text, true);
  PERFORM set_config('app.current_role', p_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 1: Create schedule_templates table
-- ============================================================================

CREATE TABLE schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for listing templates
CREATE INDEX idx_schedule_templates_created_at ON schedule_templates(created_at DESC);
CREATE INDEX idx_schedule_templates_created_by ON schedule_templates(created_by);

-- ============================================================================
-- STEP 2: RLS policies
-- ============================================================================

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates
CREATE POLICY "Templates read" ON schedule_templates
  FOR SELECT USING (true);

-- Managers and admins can insert/update/delete
CREATE POLICY "Templates insert" ON schedule_templates
  FOR INSERT WITH CHECK (is_manager_or_admin());

CREATE POLICY "Templates update" ON schedule_templates
  FOR UPDATE USING (is_manager_or_admin());

CREATE POLICY "Templates delete" ON schedule_templates
  FOR DELETE USING (is_manager_or_admin());

-- ============================================================================
-- STEP 3: Create trigger for auto-updating updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_schedule_templates_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_schedule_templates_updated_at
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW EXECUTE FUNCTION update_schedule_templates_updated_at();

-- ============================================================================
-- STEP 4: Create RPC functions for template operations
-- These handle the employee_id lookup internally
-- ============================================================================

CREATE OR REPLACE FUNCTION get_schedule_templates()
RETURNS TABLE (
  id uuid,
  name text,
  patterns jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT st.id, st.name, st.patterns, st.created_at, st.updated_at
  FROM schedule_templates st
  ORDER BY st.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_schedule_template(
  p_name text,
  p_patterns jsonb
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
  v_employee_id uuid;
BEGIN
  v_employee_id := get_current_employee_id();
  
  INSERT INTO schedule_templates (name, patterns, created_by)
  VALUES (p_name, p_patterns, v_employee_id)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_schedule_template(p_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM schedule_templates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

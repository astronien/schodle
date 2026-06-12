-- Migration: Add Audit Log System
-- Tracks all write operations for accountability and debugging

-- ============================================================================
-- STEP 0: Create prerequisite helper functions (if not already created by 016a)
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
-- STEP 1: Create audit_logs table
-- ============================================================================

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  action text NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_employee_id ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- STEP 2: Create trigger function for automatic audit logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger AS $$
DECLARE
  v_employee_id uuid;
  v_action text;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Get current employee from session context
  v_employee_id := get_current_employee_id();
  
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    employee_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_employee_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old_data,
    v_new_data
  );
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create triggers for important tables
-- ============================================================================

-- Employees
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Schedules
CREATE TRIGGER audit_schedules
  AFTER INSERT OR UPDATE OR DELETE ON schedules
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Positions
CREATE TRIGGER audit_positions
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Shift Types
CREATE TRIGGER audit_shift_types
  AFTER INSERT OR UPDATE OR DELETE ON shift_types
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Position Groups
CREATE TRIGGER audit_position_groups
  AFTER INSERT OR UPDATE OR DELETE ON position_groups
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Recurring Schedules
CREATE TRIGGER audit_recurring_schedules
  AFTER INSERT OR UPDATE OR DELETE ON recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Settings
CREATE TRIGGER audit_settings
  AFTER INSERT OR UPDATE OR DELETE ON settings
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ============================================================================
-- STEP 4: Create RLS policies for audit_logs
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Employees can see their own audit logs
-- Managers can see all audit logs
CREATE POLICY "Audit logs read" ON audit_logs
  FOR SELECT USING (
    is_manager_or_admin() OR
    employee_id = get_current_employee_id()
  );

-- Only service role can write (triggers use SECURITY DEFINER)
CREATE POLICY "Audit logs write service" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- STEP 5: Create helper function to query audit logs
-- ============================================================================

CREATE OR REPLACE FUNCTION get_audit_logs(
  p_table_name text DEFAULT NULL,
  p_employee_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  employee_name text,
  action text,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz
) AS $$
BEGIN
  -- Only managers can query audit logs
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.employee_id,
    e.full_name as employee_name,
    al.action,
    al.table_name,
    al.record_id,
    al.old_data,
    al.new_data,
    al.created_at
  FROM audit_logs al
  LEFT JOIN employees e ON al.employee_id = e.id
  WHERE (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_employee_id IS NULL OR al.employee_id = p_employee_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create cleanup function for old audit logs
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_audit_logs(p_days_to_keep integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Only managers can cleanup
  IF NOT is_manager_or_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  DELETE FROM audit_logs
  WHERE created_at < now() - (p_days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

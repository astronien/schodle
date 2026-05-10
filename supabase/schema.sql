-- Enable RLS
alter table if exists employees enable row level security;
alter table if exists positions enable row level security;
alter table if exists shift_types enable row level security;
alter table if exists schedules enable row level security;

-- Drop existing tables
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS shift_types CASCADE;

-- Positions
CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  min_required int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Employees (link to Supabase Auth via id)
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  position_id uuid NOT NULL REFERENCES positions(id),
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
  phone text,
  email text,
  avatar text,
  password_hash text,
  created_at timestamptz DEFAULT now()
);

-- Shift Types
CREATE TABLE shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  color text NOT NULL,
  requires_approval boolean NOT NULL DEFAULT false,
  requires_reason boolean NOT NULL DEFAULT false,
  requires_evidence boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  target_staff int,
  category text CHECK (category IN ('morning', 'afternoon', 'other')),
  created_at timestamptz DEFAULT now()
);

-- Schedules
CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id),
  date text NOT NULL,
  shift_type_id uuid NOT NULL REFERENCES shift_types(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'pending')),
  employee_note text,
  manager_remark text,
  swap_with_id uuid REFERENCES employees(id),
  evidence_url text,
  created_at timestamptz DEFAULT now(),

  updated_at timestamptz DEFAULT now()
);

-- Settings
CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, subscription)
);


-- Indexes
CREATE INDEX idx_schedules_employee_date ON schedules(employee_id, date);
CREATE INDEX idx_schedules_date ON schedules(date);

-- RLS Policies (allow all for demo; tighten later)
CREATE POLICY "Allow all" ON positions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shift_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);


INSERT INTO settings (key, value) VALUES
  ('store_name', 'Central Plaza Rama 9'),
  ('app_name', 'ShiftFlow');

INSERT INTO positions (code, name, min_required) VALUES

  ('BSM', 'Branch Store Manager', 1),
  ('ABSM', 'Asst. Branch Store Manager', 1),
  ('Cashier', 'Cashier', 2),
  ('Trainer', 'Trainer', 1),
  ('PIS', 'Product Information Specialist', 2);

INSERT INTO shift_types (code, name, start_time, end_time, color, requires_approval, requires_reason, requires_evidence, is_visible, target_staff, category) VALUES
  ('M1', 'Morning 1', '09:45', '18:45', '#3B82F6', false, false, false, true, 3, 'morning'),
  ('M2', 'Morning 2', '11:00', '20:00', '#60A5FA', false, false, false, true, 2, 'morning'),
  ('A1', 'Afternoon 1', '12:00', '21:00', '#818CF8', false, false, false, true, 3, 'afternoon'),
  ('A2', 'Afternoon 2', '13:00', '22:00', '#A78BFA', false, false, false, true, 2, 'afternoon'),
  ('O', 'Office', '09:00', '18:00', '#94A3B8', false, false, false, true, 1, 'other'),
  ('XC', 'Day Off', '-', '-', '#F87171', true, true, true, true, 0, null),
  ('EV', 'Event', '10:00', '22:00', '#FBBF24', true, true, false, true, 0, null),
  ('AT2', 'Training 2', '14:00', '21:00', '#10B981', true, false, false, true, 0, null),
  ('AT3', 'Training 3', '13:00', '22:00', '#059669', true, false, false, true, 0, null),
  ('B-A2', 'Big Cleaning', '14:00', '23:00', '#EC4899', true, false, false, true, 0, null),
  ('V', 'Vacation', '-', '-', '#6366F1', true, true, false, true, 0, null),
  ('ป่วย', 'Sick Leave', '-', '-', '#EF4444', true, true, true, true, 0, null);

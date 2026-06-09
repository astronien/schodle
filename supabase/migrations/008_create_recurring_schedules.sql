-- Recurring Schedules Table
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_type_id uuid NOT NULL REFERENCES shift_types(id) ON DELETE CASCADE,
  days_of_week int[] NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  start_date date NOT NULL,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  note text,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_recurring_schedules_employee ON recurring_schedules(employee_id);
CREATE INDEX idx_recurring_schedules_active ON recurring_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_schedules_date_range ON recurring_schedules(start_date, end_date);

-- RLS Policies
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read" ON recurring_schedules FOR SELECT USING (true);
CREATE POLICY "Allow write" ON recurring_schedules FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recurring_schedules_updated_at
BEFORE UPDATE ON recurring_schedules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
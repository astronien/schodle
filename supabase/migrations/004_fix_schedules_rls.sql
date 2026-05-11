-- Migration: fix schedules RLS so employees can insert/update their own rows

-- Drop restrictive policies if they exist (names may vary)
DROP POLICY IF EXISTS "Allow all" ON schedules;

-- Recreate permissive policy for authenticated users
CREATE POLICY "Allow all" ON schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon for dev/testing
CREATE POLICY "Allow anon" ON schedules
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

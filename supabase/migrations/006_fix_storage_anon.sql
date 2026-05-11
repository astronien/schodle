-- Migration: fix storage.objects RLS for anon role (app uses custom auth, not Supabase Auth)

-- Allow anon to INSERT into attachments bucket
DROP POLICY IF EXISTS "attachments_insert" ON storage.objects;
CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'attachments');

-- Allow anon to SELECT from attachments bucket
DROP POLICY IF EXISTS "attachments_select_anon" ON storage.objects;
CREATE POLICY "attachments_select_anon" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'attachments');

-- Also keep authenticated policies
DROP POLICY IF EXISTS "attachments_select" ON storage.objects;
CREATE POLICY "attachments_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_update" ON storage.objects;
CREATE POLICY "attachments_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

-- Add authenticated insert too (for future Supabase Auth migration)
CREATE POLICY "attachments_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

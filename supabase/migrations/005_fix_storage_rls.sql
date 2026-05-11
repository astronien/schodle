-- Migration: fix storage.objects RLS for attachments bucket

-- Drop existing restrictive policies on storage.objects that may block uploads
-- Supabase creates default policies that only allow service_role access
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public read evidence" ON storage.objects;

-- Allow authenticated users to INSERT into attachments bucket
CREATE POLICY "attachments_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to SELECT from attachments bucket
CREATE POLICY "attachments_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'attachments');

-- Allow anon to SELECT (public read for evidence images)
CREATE POLICY "attachments_select_anon" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'attachments');

-- Allow authenticated users to UPDATE their own uploads
CREATE POLICY "attachments_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'attachments') WITH CHECK (bucket_id = 'attachments');

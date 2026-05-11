-- Migration: create attachments storage bucket + RLS policies

-- 1) Create bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Allow authenticated users to upload evidence files
CREATE POLICY "Authenticated users can upload evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

-- 3) Allow anyone to read (evidence URLs are shared via schedule rows)
CREATE POLICY "Public read evidence"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'attachments');

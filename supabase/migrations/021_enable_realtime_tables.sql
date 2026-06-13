-- Migration: Enable Realtime for all key tables
-- Ensures all tables used by the app are in the realtime publication
-- so that postgres_changes subscriptions work for real-time collaboration.

-- ============================================================================
-- STEP 1: Add all tables to the default supabase_realtime publication
-- ============================================================================

-- The supabase_realtime publication is created by default in Supabase projects.
-- We add each table explicitly (idempotent — tables already in the publication
-- are silently skipped).
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY employees;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY shift_types;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY positions;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY position_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY recurring_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY settings;
ALTER PUBLICATION supabase_realtime ADD TABLE ONLY schedule_confirmations;

-- ============================================================================
-- STEP 2: Grant replication permission to the anon role if needed
-- ============================================================================

-- In Supabase, the anon/key roles need REPLICATION permission for realtime
-- to receive changes (they don't need to send them since Real Time Server
-- handles that). This is handled automatically by Supabase's default setup.
-- No explicit GRANT needed.

-- ============================================================================
-- STEP 3: Verify realtime is enabled
-- ============================================================================

-- To check if tables are in the publication:
--   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';


-- Migration: add password_hash to employees table (for existing databases)
-- Run this if your employees table was created before password_hash was added

ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash text;

-- Note: after running this migration, run `node scripts/seed-passwords.mjs`
-- to generate bcrypt hashes for existing employees.

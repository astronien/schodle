-- Per-group staffing targets for each shift type.
--
-- shift_types.target_staff is a single number for the whole store, so the
-- generator treated everyone as one pool: a supervisor could be used to fill
-- a slot meant for sales, and each role wasn't guaranteed its own morning /
-- afternoon cover. Targets are now set per position group, e.g.
--   { "<sales-group-id>": 2, "<supervisor-group-id>": 1 }
--
-- Stored as jsonb rather than a join table so it rides along with the
-- existing shift_types reads/writes (no new RLS policies, no db-query
-- allowlist change). target_staff is kept as the fallback for shift types
-- that have no per-group targets set.

ALTER TABLE shift_types
  ADD COLUMN IF NOT EXISTS group_targets jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN shift_types.group_targets IS
  'จำนวนคนเป้าหมายแยกตามกลุ่มตำแหน่ง: { "<position_group_id>": <จำนวนคน> } — ถ้าว่างจะใช้ target_staff รวมแทน';

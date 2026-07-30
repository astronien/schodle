-- Let the manager say WHICH shift opens and closes the store.
--
-- Migration 826864d made the generator always staff the shift that unlocks the
-- store in the morning and the one that locks it up at night, but it worked out
-- which shifts those were from `start_time` / `end_time` alone. That guess is
-- wrong for real stores: the earliest-starting shift might be a delivery or
-- stock-count shift that never touches the front door, and a shift with no
-- fixed hours can be the one that actually closes.
--
-- `boundary_role` makes it explicit: exactly one shift type may be marked
-- 'opening' and one 'closing' (the client clears the previous holder when the
-- manager picks a new one). NULL — the default for every existing row — means
-- "not specified", and the generator falls back to the old time-based
-- detection, so nothing changes for stores that never touch this setting.
--
-- Deliberately NOT backfilled: writing today's guess into the column would
-- freeze it, and it would stop tracking the times if a shift is later edited.

ALTER TABLE shift_types
  ADD COLUMN IF NOT EXISTS boundary_role text
  CONSTRAINT shift_types_boundary_role_check
  CHECK (boundary_role IN ('opening', 'closing'));

COMMENT ON COLUMN shift_types.boundary_role IS
  'กะนี้เป็นกะเปิดร้าน (''opening'') หรือกะปิดร้าน (''closing'') — NULL = ไม่ระบุ แล้ว AI จะเดาจากเวลาเข้า–เลิกงานเหมือนเดิม';

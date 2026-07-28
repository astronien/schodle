-- Add "keep this shift when clearing the month" flag to shift_types.
--
-- Context: "ล้างตารางเดือนนี้" wiped every entry in the month, so fixed
-- assignments that rarely change (weekly off days, AT shifts, office
-- shifts) had to be re-entered by hand every time. Managers can now mark
-- a shift type as preserved and the clear action will skip it.
--
-- Defaults to false so existing behaviour is unchanged, except for the
-- X (weekly off) shift which the clear flow already re-created manually.

ALTER TABLE shift_types
  ADD COLUMN IF NOT EXISTS preserve_on_clear boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN shift_types.preserve_on_clear IS
  'เมื่อ true กะประเภทนี้จะไม่ถูกลบตอนกด "ล้างตารางเดือนนี้"';

-- X = วันหยุดประจำสัปดาห์ — the clear flow used to delete then re-create
-- these one by one; preserving them is equivalent and much cheaper.
UPDATE shift_types
  SET preserve_on_clear = true
  WHERE code = 'X';

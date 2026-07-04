-- Add enforce_balance column to position_groups
-- When true, employees in the same group cannot have the same shift category
-- (e.g., if one is morning, another must be afternoon) on the same day.
ALTER TABLE position_groups
  ADD COLUMN IF NOT EXISTS enforce_balance boolean DEFAULT false;

-- Backfill existing groups to false
UPDATE position_groups SET enforce_balance = false WHERE enforce_balance IS NULL;
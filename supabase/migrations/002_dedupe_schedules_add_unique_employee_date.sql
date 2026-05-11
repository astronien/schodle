-- Migration: dedupe schedules and enforce unique(employee_id, date)

-- 1) Remove duplicates (keep latest by updated_at/created_at)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, date
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM schedules
)
DELETE FROM schedules s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 2) Add unique constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schedules_employee_date_unique'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_employee_date_unique UNIQUE (employee_id, date);
  END IF;
END$$;

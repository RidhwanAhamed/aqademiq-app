-- Mark duplicate schedule_blocks as inactive, keeping only the oldest record for each unique combination
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, title, day_of_week, start_time, end_time
      ORDER BY created_at ASC
    ) as rn
  FROM schedule_blocks
  WHERE is_active = true
)
UPDATE schedule_blocks
SET is_active = false, updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
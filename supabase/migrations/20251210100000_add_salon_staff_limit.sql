-- Add staff_limit column to salons table
ALTER TABLE salons
ADD COLUMN IF NOT EXISTS staff_limit INTEGER NOT NULL DEFAULT 10;

-- Add comment
COMMENT ON COLUMN salons.staff_limit IS 'Maximum number of staff members allowed for this salon';

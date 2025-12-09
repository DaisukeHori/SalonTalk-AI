-- =============================================
-- Migration: Add expiry_date column to salons table
-- Description: サロンの有効期限設定を追加
-- =============================================

-- Add expiry_date column to salons table
ALTER TABLE salons ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add comment to explain the column
COMMENT ON COLUMN salons.expiry_date IS 'サロンの有効期限。NULL の場合は無期限。';

-- Create an index for expiry date queries (e.g., finding expiring/expired salons)
CREATE INDEX IF NOT EXISTS idx_salons_expiry_date ON salons(expiry_date) WHERE expiry_date IS NOT NULL;

-- Add status column if not exists (for suspended functionality)
ALTER TABLE salons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Add suspended_at and suspended_reason columns if not exists
ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS internal_note TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status);

-- Add comments
COMMENT ON COLUMN salons.status IS 'サロンのステータス: active=有効, suspended=停止';
COMMENT ON COLUMN salons.suspended_at IS 'サロン停止日時';
COMMENT ON COLUMN salons.suspended_reason IS 'サロン停止理由（顧客向け）';
COMMENT ON COLUMN salons.internal_note IS '内部メモ（運営者向け）';

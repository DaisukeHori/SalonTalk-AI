-- ===========================================
-- SalonTalk AI - Schema Issue Fixes
-- ===========================================
-- Migration: 20241205000001_fix_schema_issues
-- Description: Fix schema issues found during design review
-- Date: 2025-12-05
-- ===========================================

-- ============================================================
-- 1. Add 'unknown' to speaker_segments speaker CHECK constraint
-- ============================================================
-- Problem: pyannote can fail to identify speaker, need 'unknown' option

-- Drop the old constraint and add new one with 'unknown'
ALTER TABLE speaker_segments DROP CONSTRAINT IF EXISTS speaker_segments_speaker_check;
ALTER TABLE speaker_segments
  ADD CONSTRAINT speaker_segments_speaker_check
  CHECK (speaker IN ('stylist', 'customer', 'unknown'));

COMMENT ON COLUMN speaker_segments.speaker IS '話者: stylist=美容師, customer=お客様, unknown=識別不可';

-- ============================================================
-- 2. Fix transcripts table - ensure milliseconds are used
-- ============================================================
-- The add_transcripts_and_audio migration already uses ms,
-- but we need to drop the old schema_alignment version if it exists

-- Check if start_time (seconds) column exists and migrate to ms
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcripts' AND column_name = 'start_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcripts' AND column_name = 'start_time_ms'
  ) THEN
    -- Add new ms columns
    ALTER TABLE transcripts ADD COLUMN start_time_ms INTEGER;
    ALTER TABLE transcripts ADD COLUMN end_time_ms INTEGER;

    -- Migrate data (seconds to milliseconds)
    UPDATE transcripts
    SET start_time_ms = (start_time * 1000)::INTEGER,
        end_time_ms = (end_time * 1000)::INTEGER;

    -- Make new columns NOT NULL
    ALTER TABLE transcripts ALTER COLUMN start_time_ms SET NOT NULL;
    ALTER TABLE transcripts ALTER COLUMN end_time_ms SET NOT NULL;

    -- Drop old columns
    ALTER TABLE transcripts DROP COLUMN start_time;
    ALTER TABLE transcripts DROP COLUMN end_time;

    RAISE NOTICE 'Migrated transcripts from seconds to milliseconds';
  ELSE
    RAISE NOTICE 'transcripts already uses milliseconds or table does not exist';
  END IF;
END $$;

-- ============================================================
-- 3. Deprecate analysis_results in favor of session_analyses
-- ============================================================
-- Add comment to indicate deprecation

COMMENT ON TABLE analysis_results IS
  '【非推奨】チャンク分析結果。session_analysesを使用してください。互換性のため残存。';

-- Create a view that maps analysis_results structure to session_analyses
CREATE OR REPLACE VIEW analysis_results_v2 AS
SELECT
  sa.id,
  sa.session_id,
  sa.chunk_index,
  MAX(CASE WHEN sa.indicator_type = 'talk_ratio' THEN sa.score END) AS talk_ratio_score,
  MAX(CASE WHEN sa.indicator_type = 'question_analysis' THEN sa.score END) AS question_score,
  MAX(CASE WHEN sa.indicator_type = 'emotion_analysis' THEN sa.score END) AS emotion_score,
  MAX(CASE WHEN sa.indicator_type = 'concern_keywords' THEN sa.score END) AS concern_keywords_score,
  MAX(CASE WHEN sa.indicator_type = 'proposal_timing' THEN sa.score END) AS proposal_timing_score,
  MAX(CASE WHEN sa.indicator_type = 'proposal_quality' THEN sa.score END) AS proposal_quality_score,
  MAX(CASE WHEN sa.indicator_type = 'conversion' THEN sa.score END) AS conversion_score,
  ROUND(AVG(sa.score))::INTEGER AS overall_score,
  MIN(sa.created_at) AS created_at
FROM session_analyses sa
GROUP BY sa.id, sa.session_id, sa.chunk_index;

COMMENT ON VIEW analysis_results_v2 IS
  'session_analysesを旧analysis_results形式で参照するビュー';

-- ============================================================
-- 4. Update database.ts type comments (for documentation)
-- ============================================================
-- Note: The actual TypeScript types in database.ts should be regenerated
-- using: npx supabase gen types typescript --local > src/types/database.ts

-- ============================================================
-- Summary of changes
-- ============================================================
-- 1. speaker_segments.speaker now allows 'unknown'
-- 2. transcripts uses milliseconds (start_time_ms, end_time_ms)
-- 3. analysis_results marked as deprecated, use session_analyses
-- 4. Created analysis_results_v2 view for compatibility

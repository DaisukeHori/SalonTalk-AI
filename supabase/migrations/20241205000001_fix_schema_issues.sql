-- ===========================================
-- SalonTalk AI - Schema Cleanup (Clean Design)
-- ===========================================
-- Migration: 20241205000001_fix_schema_issues
-- Description: Clean up schema for consistency across all layers
-- Date: 2025-12-05
--
-- IMPORTANT: This migration assumes no production data exists.
-- It removes redundant tables for a clean design.
-- ===========================================

-- ============================================================
-- 1. Add 'unknown' to speaker_segments speaker CHECK constraint
-- ============================================================
-- Problem: pyannote can fail to identify speaker, need 'unknown' option

ALTER TABLE speaker_segments DROP CONSTRAINT IF EXISTS speaker_segments_speaker_check;
ALTER TABLE speaker_segments
  ADD CONSTRAINT speaker_segments_speaker_check
  CHECK (speaker IN ('stylist', 'customer', 'unknown'));

COMMENT ON COLUMN speaker_segments.speaker IS '話者: stylist=美容師, customer=お客様, unknown=識別不可';

-- ============================================================
-- 2. Ensure transcripts uses milliseconds (start_time_ms/end_time_ms)
-- ============================================================
-- Migrate from seconds to milliseconds if old columns exist

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
-- 3. Drop redundant 'reports' table (use session_reports only)
-- ============================================================
-- The system uses session_reports for all report functionality.
-- The 'reports' table was redundant.

DROP VIEW IF EXISTS staff_performance CASCADE;
DROP VIEW IF EXISTS salon_analytics CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

COMMENT ON TABLE session_reports IS 'セッション終了後の詳細レポート（7指標分析結果）';

-- ============================================================
-- 4. Drop redundant 'analysis_results' table (use session_analyses only)
-- ============================================================
-- session_analyses uses normalized structure with indicator_type.
-- analysis_results was redundant and denormalized.

DROP VIEW IF EXISTS analysis_results_v2 CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;

COMMENT ON TABLE session_analyses IS 'セッション分析結果（正規化: 指標タイプ×チャンク単位）';

-- ============================================================
-- 5. Ensure session_analyses has correct structure
-- ============================================================
-- Required columns: session_id, chunk_index, indicator_type, value, score, details

DO $$
BEGIN
  -- Add indicator_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_analyses' AND column_name = 'indicator_type'
  ) THEN
    ALTER TABLE session_analyses ADD COLUMN indicator_type TEXT;
    ALTER TABLE session_analyses ADD CONSTRAINT session_analyses_indicator_check
      CHECK (indicator_type IN (
        'talk_ratio', 'question_analysis', 'emotion_analysis',
        'concern_keywords', 'proposal_timing', 'proposal_quality', 'conversion'
      ));
    RAISE NOTICE 'Added indicator_type column to session_analyses';
  END IF;

  -- Add value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_analyses' AND column_name = 'value'
  ) THEN
    ALTER TABLE session_analyses ADD COLUMN value NUMERIC(10, 4) NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added value column to session_analyses';
  END IF;

  -- Add score column if it doesn't exist (different from overall_score)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_analyses' AND column_name = 'score'
  ) THEN
    ALTER TABLE session_analyses ADD COLUMN score INTEGER NOT NULL DEFAULT 0
      CHECK (score >= 0 AND score <= 100);
    RAISE NOTICE 'Added score column to session_analyses';
  END IF;

  -- Add details column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_analyses' AND column_name = 'details'
  ) THEN
    ALTER TABLE session_analyses ADD COLUMN details JSONB;
    RAISE NOTICE 'Added details column to session_analyses';
  END IF;
END $$;

-- Drop old denormalized columns if they exist
DO $$
BEGIN
  -- Drop individual score columns (now using normalized structure)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_analyses' AND column_name = 'talk_ratio_score'
  ) THEN
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS talk_ratio_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS talk_ratio_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS question_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS question_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS emotion_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS emotion_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS concern_keywords_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS concern_keywords_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS proposal_timing_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS proposal_timing_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS proposal_quality_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS proposal_quality_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS conversion_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS conversion_detail;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS overall_score;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS suggestions;
    ALTER TABLE session_analyses DROP COLUMN IF EXISTS highlights;
    RAISE NOTICE 'Dropped denormalized columns from session_analyses';
  END IF;
END $$;

-- Add unique constraint for normalized structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_analyses_unique'
  ) THEN
    ALTER TABLE session_analyses
      ADD CONSTRAINT session_analyses_unique
      UNIQUE (session_id, chunk_index, indicator_type);
    RAISE NOTICE 'Added unique constraint to session_analyses';
  END IF;
END $$;

-- ============================================================
-- 6. Recreate performance views (without deprecated tables)
-- ============================================================

-- Staff performance view
CREATE OR REPLACE VIEW staff_performance AS
SELECT
  s.id AS staff_id,
  s.salon_id,
  s.name,
  COUNT(DISTINCT sess.id) AS total_sessions,
  AVG(sr.overall_score) AS avg_score,
  COALESCE(
    SUM(CASE WHEN sr.is_converted = true THEN 1 ELSE 0 END)::FLOAT /
    NULLIF(COUNT(DISTINCT sess.id), 0),
    0
  ) AS conversion_rate,
  MAX(sess.started_at) AS last_session_at
FROM staffs s
LEFT JOIN sessions sess ON sess.stylist_id = s.id AND sess.status = 'completed'
LEFT JOIN session_reports sr ON sr.session_id = sess.id
GROUP BY s.id, s.salon_id, s.name;

COMMENT ON VIEW staff_performance IS 'スタッフパフォーマンス集計ビュー';

-- Salon analytics view
CREATE OR REPLACE VIEW salon_analytics AS
SELECT
  sal.id AS salon_id,
  sal.name AS salon_name,
  COUNT(DISTINCT s.id) AS active_staff,
  COUNT(DISTINCT sess.id) AS total_sessions,
  AVG(sr.overall_score) AS avg_score,
  COALESCE(
    SUM(CASE WHEN sr.is_converted = true THEN 1 ELSE 0 END)::FLOAT /
    NULLIF(COUNT(DISTINCT sess.id), 0),
    0
  ) AS conversion_rate
FROM salons sal
LEFT JOIN staffs s ON s.salon_id = sal.id AND s.is_active = true
LEFT JOIN sessions sess ON sess.salon_id = sal.id AND sess.status = 'completed'
LEFT JOIN session_reports sr ON sr.session_id = sess.id
GROUP BY sal.id, sal.name;

COMMENT ON VIEW salon_analytics IS '店舗分析集計ビュー';

-- ============================================================
-- Summary of changes (for documentation)
-- ============================================================
-- 1. speaker_segments.speaker: added 'unknown' option
-- 2. transcripts: uses start_time_ms/end_time_ms (milliseconds)
-- 3. reports table: DROPPED (use session_reports)
-- 4. analysis_results table: DROPPED (use session_analyses)
-- 5. session_analyses: normalized structure (indicator_type, value, score, details)
-- 6. Recreated staff_performance and salon_analytics views

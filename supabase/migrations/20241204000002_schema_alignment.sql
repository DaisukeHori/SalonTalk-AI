-- ===========================================
-- SalonTalk AI - Schema Alignment Migration
-- ===========================================
-- Migration: 20241204000002_schema_alignment
-- Description: Align schema with design documents
-- ===========================================

-- ============================================================
-- 1. Update staffs table (add missing columns)
-- ============================================================

-- Add missing columns from design document
ALTER TABLE staffs
  ADD COLUMN IF NOT EXISTS position VARCHAR(50),
  ADD COLUMN IF NOT EXISTS join_date DATE,
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
    "notificationPreferences": {
      "concernAlert": true,
      "sessionComplete": true,
      "weeklyReport": true
    },
    "displayPreferences": {
      "showScore": true,
      "showRanking": true
    }
  }'::jsonb;

-- Create view to maintain compatibility (avatar_url -> profile_image_url)
CREATE OR REPLACE VIEW staffs_view AS
SELECT
  id,
  salon_id,
  email,
  name,
  role,
  position,
  join_date,
  COALESCE(profile_image_url, avatar_url) as profile_image_url,
  avatar_url,
  settings,
  is_active,
  created_at,
  updated_at
FROM staffs;

-- ============================================================
-- 2. Update sessions table (add diarization_status)
-- ============================================================

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS diarization_status VARCHAR(20) DEFAULT 'pending'
    CHECK (diarization_status IN ('pending', 'processing', 'completed', 'failed'));

-- ============================================================
-- 3. Create transcripts table (missing from migration)
-- ============================================================

CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time NUMERIC(10, 3) NOT NULL,
  end_time NUMERIC(10, 3) NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT transcripts_session_chunk_unique UNIQUE (session_id, chunk_index),
  CONSTRAINT transcripts_time_valid CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_session_chunk ON transcripts(session_id, chunk_index);

-- Enable RLS
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcripts_access" ON transcripts
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    )
  );

-- ============================================================
-- 4. Create session_analyses table (per design doc structure)
-- ============================================================

-- Create indicator_type enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'indicator_type') THEN
    CREATE TYPE indicator_type AS ENUM (
      'talk_ratio',
      'question_analysis',
      'emotion_analysis',
      'concern_keywords',
      'proposal_timing',
      'proposal_quality',
      'conversion'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  indicator_type VARCHAR(30) NOT NULL,
  value NUMERIC(10, 4) NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT session_analyses_unique UNIQUE (session_id, chunk_index, indicator_type)
);

CREATE INDEX IF NOT EXISTS idx_session_analyses_session_id ON session_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analyses_indicator ON session_analyses(indicator_type);
CREATE INDEX IF NOT EXISTS idx_session_analyses_session_chunk ON session_analyses(session_id, chunk_index);

-- Enable RLS
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_analyses_access" ON session_analyses
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM sessions
      WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    )
  );

-- ============================================================
-- 5. Update success_cases table (add missing columns)
-- ============================================================

ALTER TABLE success_cases
  ADD COLUMN IF NOT EXISTS stylist_id UUID REFERENCES staffs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_profile JSONB,
  ADD COLUMN IF NOT EXISTS successful_talk TEXT,
  ADD COLUMN IF NOT EXISTS key_tactics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sold_product VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Migrate existing data: approach_text -> successful_talk if not already set
UPDATE success_cases
SET successful_talk = approach_text
WHERE successful_talk IS NULL AND approach_text IS NOT NULL;

-- Migrate result -> key_tactics if not already set
UPDATE success_cases
SET key_tactics = ARRAY[result]
WHERE key_tactics = '{}' AND result IS NOT NULL;

-- ============================================================
-- 6. Create/update session_reports table (align with design)
-- ============================================================

-- If session_reports doesn't exist but reports does, rename it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_reports' AND table_schema = 'public') THEN
    -- Rename reports to session_reports
    ALTER TABLE reports RENAME TO session_reports;

    -- Rename column generated_at to created_at
    ALTER TABLE session_reports RENAME COLUMN generated_at TO created_at;
  END IF;
END $$;

-- Add missing columns to session_reports (whether renamed or created fresh)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_reports' AND table_schema = 'public') THEN
    -- Add new columns
    BEGIN ALTER TABLE session_reports ADD COLUMN good_points TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN improvement_points TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN action_items TEXT[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN transcript_summary TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN ai_feedback TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN indicator_scores JSONB DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END;
    BEGIN ALTER TABLE session_reports ADD COLUMN is_converted BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN NULL; END;

    -- Migrate data from old columns to new columns
    UPDATE session_reports
    SET good_points = COALESCE(strengths, good_points, '{}'),
        improvement_points = COALESCE(improvements, improvement_points, '{}'),
        indicator_scores = COALESCE(metrics, indicator_scores, '{}')
    WHERE good_points = '{}' OR improvement_points = '{}';
  END IF;
END $$;

-- Create session_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  summary TEXT,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  metrics JSONB DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  comparison_with_average JSONB DEFAULT '[]'::jsonb,
  matched_success_cases JSONB DEFAULT '[]'::jsonb,
  good_points TEXT[] DEFAULT '{}',
  improvement_points TEXT[] DEFAULT '{}',
  action_items TEXT[] DEFAULT '{}',
  transcript_summary TEXT,
  ai_feedback TEXT,
  indicator_scores JSONB DEFAULT '{}',
  is_converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a compatibility view for 'reports' table name
CREATE OR REPLACE VIEW reports AS SELECT * FROM session_reports;

-- ============================================================
-- 7. Create audit_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES staffs(id),
  salon_id UUID REFERENCES salons(id),
  resource_type VARCHAR(50),
  resource_id UUID,
  action VARCHAR(20),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_salon ON audit_logs(salon_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Auto-delete after 90 days
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Utility Functions (from design doc)
-- ============================================================

-- Get current user's salon ID
CREATE OR REPLACE FUNCTION get_current_user_salon_id()
RETURNS UUID AS $$
  SELECT salon_id FROM staffs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM staffs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's staff ID
CREATE OR REPLACE FUNCTION get_current_user_staff_id()
RETURNS UUID AS $$
  SELECT id FROM staffs WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Staff statistics function
CREATE OR REPLACE FUNCTION get_staff_statistics(
  p_staff_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_count BIGINT,
  conversion_rate NUMERIC,
  total_duration_minutes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)::BIGINT AS total_sessions,
    COALESCE(ROUND(AVG(r.overall_score), 1), 0::NUMERIC) AS avg_score,
    COALESCE(
      SUM(CASE WHEN (ar.metrics->>'converted')::boolean = true THEN 1 ELSE 0 END)::BIGINT,
      0::BIGINT
    ) AS conversion_count,
    COALESCE(
      ROUND(
        SUM(CASE WHEN (ar.metrics->>'converted')::boolean = true THEN 1 ELSE 0 END)::NUMERIC /
        NULLIF(COUNT(DISTINCT s.id), 0) * 100,
        1
      ),
      0::NUMERIC
    ) AS conversion_rate,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) / 60)::BIGINT,
      0::BIGINT
    ) AS total_duration_minutes
  FROM sessions s
  LEFT JOIN reports r ON r.session_id = s.id
  LEFT JOIN analysis_results ar ON ar.session_id = s.id
  WHERE
    s.stylist_id = p_staff_id
    AND s.status = 'completed'
    AND s.started_at >= p_start_date
    AND s.started_at <= p_end_date;
END;
$$;

-- Salon statistics function
CREATE OR REPLACE FUNCTION get_salon_statistics(
  p_salon_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_sessions BIGINT,
  avg_score NUMERIC,
  conversion_rate NUMERIC,
  active_stylists BIGINT,
  top_performer_id UUID,
  top_performer_name TEXT,
  top_performer_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      s.stylist_id,
      COUNT(*) AS session_count,
      AVG(r.overall_score) AS avg_score
    FROM sessions s
    LEFT JOIN reports r ON r.session_id = s.id
    WHERE
      s.salon_id = p_salon_id
      AND s.status = 'completed'
      AND s.started_at >= p_start_date
      AND s.started_at <= p_end_date
    GROUP BY s.stylist_id
  ),
  top_performer AS (
    SELECT
      st.id,
      st.name,
      ss.avg_score
    FROM session_stats ss
    JOIN staffs st ON st.id = ss.stylist_id
    ORDER BY ss.avg_score DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM sessions WHERE salon_id = p_salon_id AND status = 'completed' AND started_at >= p_start_date AND started_at <= p_end_date) AS total_sessions,
    (SELECT ROUND(AVG(r.overall_score), 1)::NUMERIC FROM sessions s JOIN reports r ON r.session_id = s.id WHERE s.salon_id = p_salon_id AND s.status = 'completed' AND s.started_at >= p_start_date AND s.started_at <= p_end_date) AS avg_score,
    (SELECT ROUND(
      SUM(CASE WHEN (ar.metrics->>'converted')::boolean = true THEN 1 ELSE 0 END)::NUMERIC /
      NULLIF(COUNT(DISTINCT s.id), 0) * 100, 1)::NUMERIC
    FROM sessions s
    LEFT JOIN analysis_results ar ON ar.session_id = s.id
    WHERE s.salon_id = p_salon_id AND s.status = 'completed' AND s.started_at >= p_start_date AND s.started_at <= p_end_date
    ) AS conversion_rate,
    (SELECT COUNT(DISTINCT stylist_id)::BIGINT FROM sessions WHERE salon_id = p_salon_id AND started_at >= p_start_date AND started_at <= p_end_date) AS active_stylists,
    tp.id AS top_performer_id,
    tp.name AS top_performer_name,
    ROUND(tp.avg_score, 1)::NUMERIC AS top_performer_score
  FROM top_performer tp;
END;
$$;

-- Increment training count function
CREATE OR REPLACE FUNCTION increment_training_count(p_staff_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE staffs
  SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{trainingCount}',
    to_jsonb(COALESCE((settings->>'trainingCount')::integer, 0) + 1)
  )
  WHERE id = p_staff_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Add speaker_label to speaker_segments if missing
-- ============================================================

ALTER TABLE speaker_segments
  ADD COLUMN IF NOT EXISTS speaker_label VARCHAR(10);

-- ============================================================
-- 10. Update training_scenarios to match design
-- ============================================================

-- Add missing columns
ALTER TABLE training_scenarios
  ADD COLUMN IF NOT EXISTS name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50),
  ADD COLUMN IF NOT EXISTS initial_prompt TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_criteria JSONB;

-- Migrate existing data
UPDATE training_scenarios
SET name = title,
    level = difficulty,
    category = 'general'
WHERE name IS NULL;

-- ============================================================
-- 11. Update roleplay_sessions to match design
-- ============================================================

ALTER TABLE roleplay_sessions
  ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_score INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Migrate existing data
UPDATE roleplay_sessions
SET conversation_history = messages
WHERE conversation_history = '[]'::jsonb AND messages != '[]'::jsonb;

UPDATE roleplay_sessions
SET completed_at = ended_at
WHERE completed_at IS NULL AND ended_at IS NOT NULL;

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE transcripts IS '文字起こし結果（チャンク単位）';
COMMENT ON TABLE session_analyses IS 'セッション分析（指標タイプ別）';
COMMENT ON TABLE audit_logs IS '監査ログ（90日で自動削除）';
COMMENT ON FUNCTION get_current_user_salon_id() IS '現在のユーザーの店舗IDを取得';
COMMENT ON FUNCTION get_current_user_role() IS '現在のユーザーのロールを取得';
COMMENT ON FUNCTION get_staff_statistics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'スタッフ統計を取得';
COMMENT ON FUNCTION get_salon_statistics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS '店舗統計を取得';

-- ===========================================
-- SalonTalk AI - Additional Functions and Tables
-- ===========================================
-- Migration: 20241204000003_add_functions_and_tables
-- Description: Add get_staff_statistics function, session_analyses table,
--              push tokens, notification logs, and training functions
-- ===========================================

-- ===========================================
-- 1. Session Analyses Table (Detailed per-chunk analysis)
-- ===========================================
CREATE TABLE IF NOT EXISTS session_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

    -- Individual metric scores (7 indicators)
    talk_ratio_score INTEGER CHECK (talk_ratio_score >= 0 AND talk_ratio_score <= 100),
    talk_ratio_detail JSONB DEFAULT '{}',

    question_score INTEGER CHECK (question_score >= 0 AND question_score <= 100),
    question_detail JSONB DEFAULT '{}',

    emotion_score INTEGER CHECK (emotion_score >= 0 AND emotion_score <= 100),
    emotion_detail JSONB DEFAULT '{}',

    concern_keywords_score INTEGER CHECK (concern_keywords_score >= 0 AND concern_keywords_score <= 100),
    concern_keywords_detail JSONB DEFAULT '{}',

    proposal_timing_score INTEGER CHECK (proposal_timing_score >= 0 AND proposal_timing_score <= 100),
    proposal_timing_detail JSONB DEFAULT '{}',

    proposal_quality_score INTEGER CHECK (proposal_quality_score >= 0 AND proposal_quality_score <= 100),
    proposal_quality_detail JSONB DEFAULT '{}',

    conversion_score INTEGER CHECK (conversion_score >= 0 AND conversion_score <= 100),
    conversion_detail JSONB DEFAULT '{}',

    suggestions TEXT[] DEFAULT '{}',
    highlights TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_analyses_session_id ON session_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_session_analyses_chunk ON session_analyses(session_id, chunk_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_analyses_unique_chunk ON session_analyses(session_id, chunk_index);

-- RLS
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_analysis_access" ON session_analyses
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 2. Session Reports Table (Detailed report structure)
-- ===========================================
CREATE TABLE IF NOT EXISTS session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

    summary TEXT NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

    -- Aggregated metrics
    metrics JSONB NOT NULL DEFAULT '{}',

    -- Talk ratio details
    stylist_ratio INTEGER,
    customer_ratio INTEGER,

    -- Question analysis
    open_question_count INTEGER DEFAULT 0,
    closed_question_count INTEGER DEFAULT 0,

    -- Emotion analysis
    positive_ratio INTEGER,

    -- Concern keywords
    concern_keywords TEXT[] DEFAULT '{}',

    -- Proposal analysis
    proposal_timing_ms INTEGER,
    proposal_match_rate INTEGER,

    -- Conversion
    is_converted BOOLEAN DEFAULT FALSE,

    -- Feedback
    improvements TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',

    -- Matched success cases
    matched_cases JSONB DEFAULT '[]',

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_reports_session_id ON session_reports(session_id);

-- RLS
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_report_access" ON session_reports
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 3. Push Tokens Table
-- ===========================================
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_staff_id ON push_tokens(staff_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_unique ON push_tokens(staff_id, token);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_token_access" ON push_tokens
    FOR ALL
    USING (staff_id = auth.uid());

-- ===========================================
-- 4. Notification Logs Table
-- ===========================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_logs_staff_id ON notification_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_access" ON notification_logs
    FOR ALL
    USING (staff_id = auth.uid());

-- ===========================================
-- 5. Staff Training Stats Table
-- ===========================================
CREATE TABLE IF NOT EXISTS staff_training_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    total_training_count INTEGER NOT NULL DEFAULT 0,
    total_score_sum INTEGER NOT NULL DEFAULT 0,
    average_score REAL GENERATED ALWAYS AS (
        CASE WHEN total_training_count > 0
        THEN total_score_sum::REAL / total_training_count
        ELSE 0 END
    ) STORED,
    highest_score INTEGER DEFAULT 0,
    last_training_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_training_stats_staff ON staff_training_stats(staff_id);

-- RLS
ALTER TABLE staff_training_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_stats_access" ON staff_training_stats
    FOR ALL
    USING (staff_id = auth.uid());

-- ===========================================
-- 6. Get Staff Statistics Function
-- ===========================================
CREATE OR REPLACE FUNCTION get_staff_statistics(
    p_staff_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    staff_id UUID,
    staff_name TEXT,
    salon_name TEXT,

    -- Session statistics
    total_sessions INTEGER,
    completed_sessions INTEGER,
    total_duration_hours REAL,
    avg_session_duration_minutes REAL,

    -- Score statistics
    avg_overall_score REAL,
    avg_talk_ratio_score REAL,
    avg_question_score REAL,
    avg_emotion_score REAL,
    avg_concern_keywords_score REAL,
    avg_proposal_timing_score REAL,
    avg_proposal_quality_score REAL,
    avg_conversion_score REAL,

    -- Conversion statistics
    conversion_count INTEGER,
    conversion_rate REAL,

    -- Training statistics
    training_count INTEGER,
    avg_training_score REAL,

    -- Trends
    score_trend JSONB,

    -- Period info
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    -- Set default date range if not provided (last 30 days)
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());

    RETURN QUERY
    WITH staff_sessions AS (
        SELECT
            s.id,
            s.started_at,
            s.ended_at,
            s.status,
            s.total_duration_ms
        FROM sessions s
        WHERE s.stylist_id = p_staff_id
            AND s.started_at >= v_start_date
            AND s.started_at <= v_end_date
    ),
    session_scores AS (
        SELECT
            sa.session_id,
            AVG(sa.overall_score) as overall_score,
            AVG(sa.talk_ratio_score) as talk_ratio_score,
            AVG(sa.question_score) as question_score,
            AVG(sa.emotion_score) as emotion_score,
            AVG(sa.concern_keywords_score) as concern_keywords_score,
            AVG(sa.proposal_timing_score) as proposal_timing_score,
            AVG(sa.proposal_quality_score) as proposal_quality_score,
            AVG(sa.conversion_score) as conversion_score
        FROM session_analyses sa
        WHERE sa.session_id IN (SELECT id FROM staff_sessions)
        GROUP BY sa.session_id
    ),
    report_data AS (
        SELECT
            sr.session_id,
            sr.is_converted
        FROM session_reports sr
        WHERE sr.session_id IN (SELECT id FROM staff_sessions)
    ),
    training_data AS (
        SELECT
            sts.total_training_count,
            sts.average_score
        FROM staff_training_stats sts
        WHERE sts.staff_id = p_staff_id
    ),
    weekly_scores AS (
        SELECT
            date_trunc('week', ss.started_at) as week_start,
            AVG(sco.overall_score)::REAL as avg_score
        FROM staff_sessions ss
        LEFT JOIN session_scores sco ON sco.session_id = ss.id
        WHERE ss.status = 'completed'
        GROUP BY date_trunc('week', ss.started_at)
        ORDER BY week_start
    )
    SELECT
        st.id,
        st.name,
        sal.name,

        -- Session statistics
        COUNT(DISTINCT ss.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.id END)::INTEGER,
        COALESCE(SUM(ss.total_duration_ms)::REAL / 3600000, 0),
        COALESCE(AVG(ss.total_duration_ms)::REAL / 60000, 0),

        -- Score statistics
        COALESCE(AVG(sco.overall_score)::REAL, 0),
        COALESCE(AVG(sco.talk_ratio_score)::REAL, 0),
        COALESCE(AVG(sco.question_score)::REAL, 0),
        COALESCE(AVG(sco.emotion_score)::REAL, 0),
        COALESCE(AVG(sco.concern_keywords_score)::REAL, 0),
        COALESCE(AVG(sco.proposal_timing_score)::REAL, 0),
        COALESCE(AVG(sco.proposal_quality_score)::REAL, 0),
        COALESCE(AVG(sco.conversion_score)::REAL, 0),

        -- Conversion statistics
        COALESCE(SUM(CASE WHEN rd.is_converted THEN 1 ELSE 0 END)::INTEGER, 0),
        CASE
            WHEN COUNT(DISTINCT ss.id) > 0
            THEN (SUM(CASE WHEN rd.is_converted THEN 1 ELSE 0 END)::REAL / COUNT(DISTINCT ss.id))
            ELSE 0
        END,

        -- Training statistics
        COALESCE(td.total_training_count, 0),
        COALESCE(td.average_score, 0),

        -- Trends (weekly scores as JSON array)
        COALESCE(
            (SELECT json_agg(json_build_object(
                'week', ws.week_start,
                'score', ws.avg_score
            ) ORDER BY ws.week_start)
            FROM weekly_scores ws),
            '[]'::json
        ),

        -- Period info
        v_start_date,
        v_end_date

    FROM staffs st
    JOIN salons sal ON sal.id = st.salon_id
    LEFT JOIN staff_sessions ss ON true
    LEFT JOIN session_scores sco ON sco.session_id = ss.id
    LEFT JOIN report_data rd ON rd.session_id = ss.id
    LEFT JOIN training_data td ON true
    WHERE st.id = p_staff_id
    GROUP BY st.id, st.name, sal.name, td.total_training_count, td.average_score;
END;
$$;

-- ===========================================
-- 7. Increment Training Count Function
-- ===========================================
CREATE OR REPLACE FUNCTION increment_training_count(
    p_staff_id UUID,
    p_score INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO staff_training_stats (staff_id, total_training_count, total_score_sum, highest_score, last_training_at)
    VALUES (p_staff_id, 1, p_score, p_score, NOW())
    ON CONFLICT (staff_id)
    DO UPDATE SET
        total_training_count = staff_training_stats.total_training_count + 1,
        total_score_sum = staff_training_stats.total_score_sum + p_score,
        highest_score = GREATEST(staff_training_stats.highest_score, p_score),
        last_training_at = NOW(),
        updated_at = NOW();
END;
$$;

-- ===========================================
-- 8. Get Salon Statistics Function
-- ===========================================
CREATE OR REPLACE FUNCTION get_salon_statistics(
    p_salon_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    salon_id UUID,
    salon_name TEXT,

    -- Staff statistics
    total_staff INTEGER,
    active_staff INTEGER,

    -- Session statistics
    total_sessions INTEGER,
    completed_sessions INTEGER,
    avg_sessions_per_staff REAL,

    -- Score statistics
    avg_overall_score REAL,

    -- Conversion statistics
    conversion_count INTEGER,
    conversion_rate REAL,

    -- Training statistics
    total_training_count INTEGER,
    avg_training_score REAL,

    -- Top performers
    top_performers JSONB,

    -- Period info
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());

    RETURN QUERY
    WITH salon_sessions AS (
        SELECT
            s.id,
            s.stylist_id,
            s.status
        FROM sessions s
        WHERE s.salon_id = p_salon_id
            AND s.started_at >= v_start_date
            AND s.started_at <= v_end_date
    ),
    staff_scores AS (
        SELECT
            ss.stylist_id,
            AVG(sa.overall_score) as avg_score,
            COUNT(DISTINCT ss.id) as session_count
        FROM salon_sessions ss
        JOIN session_analyses sa ON sa.session_id = ss.id
        WHERE ss.status = 'completed'
        GROUP BY ss.stylist_id
    ),
    top_staff AS (
        SELECT
            st.id,
            st.name,
            sco.avg_score,
            sco.session_count
        FROM staff_scores sco
        JOIN staffs st ON st.id = sco.stylist_id
        ORDER BY sco.avg_score DESC
        LIMIT 5
    )
    SELECT
        sal.id,
        sal.name,

        -- Staff statistics
        COUNT(DISTINCT st.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN st.is_active THEN st.id END)::INTEGER,

        -- Session statistics
        COUNT(DISTINCT ss.id)::INTEGER,
        COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.id END)::INTEGER,
        CASE
            WHEN COUNT(DISTINCT st.id) > 0
            THEN COUNT(DISTINCT ss.id)::REAL / COUNT(DISTINCT st.id)
            ELSE 0
        END,

        -- Score statistics
        COALESCE(AVG(sco.avg_score)::REAL, 0),

        -- Conversion statistics (placeholder)
        0,
        0.0,

        -- Training statistics
        COALESCE(SUM(sts.total_training_count)::INTEGER, 0),
        COALESCE(AVG(sts.average_score)::REAL, 0),

        -- Top performers
        COALESCE(
            (SELECT json_agg(json_build_object(
                'id', ts.id,
                'name', ts.name,
                'avgScore', ts.avg_score,
                'sessionCount', ts.session_count
            ) ORDER BY ts.avg_score DESC)
            FROM top_staff ts),
            '[]'::json
        ),

        -- Period info
        v_start_date,
        v_end_date

    FROM salons sal
    LEFT JOIN staffs st ON st.salon_id = sal.id
    LEFT JOIN salon_sessions ss ON ss.stylist_id = st.id
    LEFT JOIN staff_scores sco ON sco.stylist_id = st.id
    LEFT JOIN staff_training_stats sts ON sts.staff_id = st.id
    WHERE sal.id = p_salon_id
    GROUP BY sal.id, sal.name;
END;
$$;

-- ===========================================
-- 9. Add Updated At Trigger for New Tables
-- ===========================================
CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_training_stats_updated_at
    BEFORE UPDATE ON staff_training_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 10. Add Missing Columns to Success Cases
-- ===========================================
DO $$
BEGIN
    -- Add content column for embedding text
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'success_cases' AND column_name = 'content'
    ) THEN
        ALTER TABLE success_cases ADD COLUMN content TEXT;
    END IF;

    -- Add metadata column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'success_cases' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE success_cases ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;

    -- Add staff_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'success_cases' AND column_name = 'staff_id'
    ) THEN
        ALTER TABLE success_cases ADD COLUMN staff_id UUID REFERENCES staffs(id);
    END IF;
END $$;

-- Add unique constraint on session_id for success_cases
CREATE UNIQUE INDEX IF NOT EXISTS idx_success_cases_session ON success_cases(session_id) WHERE session_id IS NOT NULL;

-- ===========================================
-- 11. Add confidence column to transcripts
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcripts' AND column_name = 'confidence'
    ) THEN
        ALTER TABLE transcripts ADD COLUMN confidence REAL DEFAULT 1.0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transcripts' AND column_name = 'speaker_label'
    ) THEN
        ALTER TABLE transcripts ADD COLUMN speaker_label TEXT;
    END IF;
END $$;

-- ===========================================
-- 12. Add speaker_label column to speaker_segments
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'speaker_segments' AND column_name = 'speaker_label'
    ) THEN
        ALTER TABLE speaker_segments ADD COLUMN speaker_label TEXT;
    END IF;
END $$;

-- ===========================================
-- 13. Update roleplay_sessions for evaluate-roleplay
-- ===========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'roleplay_sessions' AND column_name = 'evaluated_at'
    ) THEN
        ALTER TABLE roleplay_sessions ADD COLUMN evaluated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update roleplay_sessions status check constraint
ALTER TABLE roleplay_sessions DROP CONSTRAINT IF EXISTS roleplay_sessions_status_check;
ALTER TABLE roleplay_sessions ADD CONSTRAINT roleplay_sessions_status_check
    CHECK (status IN ('in_progress', 'completed', 'abandoned', 'evaluated'));

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE session_analyses IS 'セッション分析結果（チャンク単位、7指標詳細）';
COMMENT ON TABLE session_reports IS 'セッション終了後の詳細レポート';
COMMENT ON TABLE push_tokens IS 'プッシュ通知トークン';
COMMENT ON TABLE notification_logs IS '通知送信履歴';
COMMENT ON TABLE staff_training_stats IS 'スタッフトレーニング統計';
COMMENT ON FUNCTION get_staff_statistics IS 'スタッフ統計情報取得関数';
COMMENT ON FUNCTION get_salon_statistics IS '店舗統計情報取得関数';
COMMENT ON FUNCTION increment_training_count IS 'トレーニング回数・スコア更新関数';

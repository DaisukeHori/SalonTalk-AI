-- ===========================================
-- SalonTalk AI - Complete Initial Schema
-- ===========================================
-- Single consolidated migration for clean deployment
-- Date: 2025-12-05
-- ===========================================

-- ============================================================
-- Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- 1. Core Tables
-- ============================================================

-- ------------------------------------------------------------
-- salons (店舗)
-- ------------------------------------------------------------
CREATE TABLE salons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium', 'enterprise')),
    seats_count INTEGER,
    settings JSONB NOT NULL DEFAULT '{
        "language": "ja",
        "timezone": "Asia/Tokyo",
        "recordingEnabled": true,
        "analysisEnabled": true,
        "notificationsEnabled": true,
        "maxConcurrentSessions": 10,
        "sessionTimeoutMinutes": 180,
        "dataRetentionDays": 365
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salons_plan ON salons(plan);

-- ------------------------------------------------------------
-- staffs (スタッフ) - id = auth.users(id) pattern
-- ------------------------------------------------------------
CREATE TABLE staffs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'stylist' CHECK (role IN ('stylist', 'manager', 'owner', 'admin')),
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staffs_salon_id ON staffs(salon_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE UNIQUE INDEX idx_staffs_email ON staffs(email);
CREATE INDEX idx_staffs_salon_active ON staffs(salon_id, is_active) WHERE is_active = true;

-- ------------------------------------------------------------
-- sessions (セッション)
-- ------------------------------------------------------------
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    stylist_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'analyzing', 'completed', 'error')),
    diarization_status TEXT DEFAULT 'pending' CHECK (diarization_status IN ('pending', 'processing', 'completed', 'failed')),
    customer_info JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_salon_id ON sessions(salon_id);
CREATE INDEX idx_sessions_stylist_id ON sessions(stylist_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX idx_sessions_salon_started ON sessions(salon_id, started_at DESC);
CREATE INDEX idx_sessions_stylist_started ON sessions(stylist_id, started_at DESC);

-- ============================================================
-- 2. Audio Processing Tables
-- ============================================================

-- ------------------------------------------------------------
-- transcripts (文字起こし) - uses milliseconds
-- ------------------------------------------------------------
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    audio_url TEXT,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT transcripts_session_chunk_unique UNIQUE (session_id, chunk_index),
    CONSTRAINT transcripts_time_valid CHECK (end_time_ms > start_time_ms)
);

CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_transcripts_session_chunk ON transcripts(session_id, chunk_index);

-- ------------------------------------------------------------
-- speaker_segments (話者セグメント) - uses milliseconds
-- ------------------------------------------------------------
CREATE TABLE speaker_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('stylist', 'customer', 'unknown')),
    text TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT speaker_segments_time_valid CHECK (end_time_ms > start_time_ms)
);

CREATE INDEX idx_speaker_segments_session_id ON speaker_segments(session_id);
CREATE INDEX idx_speaker_segments_chunk ON speaker_segments(session_id, chunk_index);
CREATE INDEX idx_speaker_segments_session_time ON speaker_segments(session_id, start_time_ms);

-- ============================================================
-- 3. Analysis Tables (Normalized Structure)
-- ============================================================

-- ------------------------------------------------------------
-- session_analyses (セッション分析) - normalized by indicator_type
-- ------------------------------------------------------------
CREATE TABLE session_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    indicator_type TEXT NOT NULL CHECK (indicator_type IN (
        'talk_ratio', 'question_analysis', 'emotion_analysis',
        'concern_keywords', 'proposal_timing', 'proposal_quality', 'conversion'
    )),
    value NUMERIC(10, 4) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT session_analyses_unique UNIQUE (session_id, chunk_index, indicator_type)
);

CREATE INDEX idx_session_analyses_session_id ON session_analyses(session_id);
CREATE INDEX idx_session_analyses_session_chunk ON session_analyses(session_id, chunk_index);
CREATE INDEX idx_session_analyses_indicator ON session_analyses(indicator_type);

-- ------------------------------------------------------------
-- session_reports (セッションレポート)
-- ------------------------------------------------------------
CREATE TABLE session_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
    summary TEXT NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    metrics JSONB NOT NULL DEFAULT '{}',
    stylist_ratio INTEGER,
    customer_ratio INTEGER,
    open_question_count INTEGER DEFAULT 0,
    closed_question_count INTEGER DEFAULT 0,
    positive_ratio INTEGER,
    concern_keywords TEXT[] DEFAULT '{}',
    proposal_timing_ms INTEGER,
    proposal_match_rate INTEGER,
    is_converted BOOLEAN DEFAULT FALSE,
    improvements TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    matched_cases JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_reports_session_id ON session_reports(session_id);
CREATE INDEX idx_session_reports_score ON session_reports(overall_score DESC);

-- ============================================================
-- 4. Success Cases (with vector search)
-- ============================================================

CREATE TABLE success_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    stylist_id UUID REFERENCES staffs(id) ON DELETE SET NULL,
    concern_keywords TEXT[] NOT NULL,
    customer_profile JSONB,
    approach_text TEXT NOT NULL,
    successful_talk TEXT,
    key_tactics TEXT[],
    result TEXT NOT NULL,
    sold_product TEXT,
    conversion_rate REAL,
    embedding VECTOR(1536),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_success_cases_salon_id ON success_cases(salon_id);
CREATE INDEX idx_success_cases_active ON success_cases(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_success_cases_public ON success_cases(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_success_cases_concern ON success_cases USING GIN(concern_keywords);
CREATE INDEX idx_success_cases_embedding ON success_cases
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- 5. Training System
-- ============================================================

-- ------------------------------------------------------------
-- training_scenarios - uses title/difficulty
-- ------------------------------------------------------------
CREATE TABLE training_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    customer_persona JSONB NOT NULL,
    objectives TEXT[] NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_minutes INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_scenarios_salon_id ON training_scenarios(salon_id);
CREATE INDEX idx_training_scenarios_difficulty ON training_scenarios(difficulty);
CREATE INDEX idx_training_scenarios_active ON training_scenarios(is_active);

-- ------------------------------------------------------------
-- roleplay_sessions - uses messages/ended_at
-- ------------------------------------------------------------
CREATE TABLE roleplay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES training_scenarios(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX idx_roleplay_sessions_staff_id ON roleplay_sessions(staff_id);
CREATE INDEX idx_roleplay_sessions_scenario_id ON roleplay_sessions(scenario_id);
CREATE INDEX idx_roleplay_sessions_status ON roleplay_sessions(status);

-- ------------------------------------------------------------
-- staff_training_stats
-- ------------------------------------------------------------
CREATE TABLE staff_training_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE UNIQUE,
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

-- ============================================================
-- 6. Notifications
-- ============================================================

CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_staff_id ON push_tokens(staff_id);
CREATE UNIQUE INDEX idx_push_tokens_unique ON push_tokens(staff_id, token);

CREATE TABLE notification_logs (
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

CREATE INDEX idx_notification_logs_staff_id ON notification_logs(staff_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

-- ============================================================
-- 7. Updated At Trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_salons_updated_at BEFORE UPDATE ON salons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staffs_updated_at BEFORE UPDATE ON staffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_success_cases_updated_at BEFORE UPDATE ON success_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_training_stats_updated_at BEFORE UPDATE ON staff_training_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. RLS Utility Functions
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_staff_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM staffs WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_salon_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT salon_id FROM staffs WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM staffs WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM staffs WHERE id = auth.uid() AND role IN ('owner', 'manager'));
$$;

CREATE OR REPLACE FUNCTION can_access_session(session_id_param UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM sessions s
    JOIN staffs st ON s.salon_id = st.salon_id
    WHERE s.id = session_id_param AND st.id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION get_current_staff_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_salon_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_manager_or_owner TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_session TO authenticated;

-- ============================================================
-- 9. Row Level Security
-- ============================================================

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleplay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Salons
CREATE POLICY "salon_access" ON salons FOR ALL USING (id = get_current_salon_id());

-- Staffs
CREATE POLICY "staff_view_same_salon" ON staffs FOR SELECT USING (salon_id = get_current_salon_id());
CREATE POLICY "staff_update_own" ON staffs FOR UPDATE USING (id = auth.uid());

-- Sessions
CREATE POLICY "session_access" ON sessions FOR ALL USING (salon_id = get_current_salon_id());

-- Transcripts
CREATE POLICY "transcript_access" ON transcripts FOR ALL USING (can_access_session(session_id));

-- Speaker Segments
CREATE POLICY "speaker_segment_access" ON speaker_segments FOR ALL USING (can_access_session(session_id));

-- Session Analyses
CREATE POLICY "session_analysis_access" ON session_analyses FOR ALL USING (can_access_session(session_id));

-- Session Reports
CREATE POLICY "session_report_access" ON session_reports FOR ALL USING (can_access_session(session_id));

-- Success Cases
CREATE POLICY "success_case_select" ON success_cases FOR SELECT USING (salon_id = get_current_salon_id() OR is_public = true);
CREATE POLICY "success_case_manage" ON success_cases FOR INSERT WITH CHECK (salon_id = get_current_salon_id());
CREATE POLICY "success_case_update" ON success_cases FOR UPDATE USING (salon_id = get_current_salon_id());
CREATE POLICY "success_case_delete" ON success_cases FOR DELETE USING (salon_id = get_current_salon_id() AND is_manager_or_owner());

-- Training Scenarios
CREATE POLICY "training_scenario_access" ON training_scenarios FOR SELECT USING (salon_id IS NULL OR salon_id = get_current_salon_id());

-- Roleplay Sessions
CREATE POLICY "roleplay_session_access" ON roleplay_sessions FOR ALL USING (staff_id = get_current_staff_id());

-- Push Tokens
CREATE POLICY "push_token_access" ON push_tokens FOR ALL USING (staff_id = get_current_staff_id());

-- Notification Logs
CREATE POLICY "notification_log_access" ON notification_logs FOR SELECT USING (staff_id = get_current_staff_id());

-- ============================================================
-- 10. Functions
-- ============================================================

-- Vector Search Function
CREATE OR REPLACE FUNCTION search_success_cases(
    query_embedding VECTOR(1536),
    match_threshold FLOAT,
    match_count INT,
    salon_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    concern_keywords TEXT[],
    approach_text TEXT,
    result TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id,
        sc.concern_keywords,
        sc.approach_text,
        sc.result,
        1 - (sc.embedding <=> query_embedding) AS similarity
    FROM success_cases sc
    WHERE sc.is_active = TRUE
        AND (salon_id IS NULL OR sc.salon_id = salon_id OR sc.is_public = TRUE)
        AND 1 - (sc.embedding <=> query_embedding) > match_threshold
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Increment Training Count Function
CREATE OR REPLACE FUNCTION increment_training_count(p_staff_id UUID, p_score INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- ============================================================
-- 11. Views
-- ============================================================

CREATE OR REPLACE VIEW staff_performance AS
SELECT
    s.id AS staff_id,
    s.salon_id,
    s.name,
    COUNT(DISTINCT sess.id) AS total_sessions,
    AVG(sr.overall_score) AS avg_score,
    COALESCE(
        SUM(CASE WHEN sr.is_converted = true THEN 1 ELSE 0 END)::FLOAT /
        NULLIF(COUNT(DISTINCT sess.id), 0), 0
    ) AS conversion_rate,
    MAX(sess.started_at) AS last_session_at
FROM staffs s
LEFT JOIN sessions sess ON sess.stylist_id = s.id AND sess.status = 'completed'
LEFT JOIN session_reports sr ON sr.session_id = sess.id
GROUP BY s.id, s.salon_id, s.name;

CREATE OR REPLACE VIEW salon_analytics AS
SELECT
    sal.id AS salon_id,
    sal.name AS salon_name,
    COUNT(DISTINCT s.id) AS active_staff,
    COUNT(DISTINCT sess.id) AS total_sessions,
    AVG(sr.overall_score) AS avg_score,
    COALESCE(
        SUM(CASE WHEN sr.is_converted = true THEN 1 ELSE 0 END)::FLOAT /
        NULLIF(COUNT(DISTINCT sess.id), 0), 0
    ) AS conversion_rate
FROM salons sal
LEFT JOIN staffs s ON s.salon_id = sal.id AND s.is_active = true
LEFT JOIN sessions sess ON sess.salon_id = sal.id AND sess.status = 'completed'
LEFT JOIN session_reports sr ON sr.session_id = sess.id
GROUP BY sal.id, sal.name;

-- ============================================================
-- 12. Storage Bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-chunks',
    'audio-chunks',
    false,
    10485760,
    ARRAY['audio/wav', 'audio/mpeg', 'audio/webm']
) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "upload_audio_chunks" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'audio-chunks' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (SELECT salon_id::text FROM staffs WHERE id = auth.uid())
    );

CREATE POLICY "read_audio_chunks" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'audio-chunks' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (SELECT salon_id::text FROM staffs WHERE id = auth.uid())
    );

CREATE POLICY "service_role_audio_chunks" ON storage.objects
    FOR ALL USING (bucket_id = 'audio-chunks' AND auth.role() = 'service_role')
    WITH CHECK (bucket_id = 'audio-chunks' AND auth.role() = 'service_role');

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE salons IS '店舗マスタ';
COMMENT ON TABLE staffs IS 'スタッフ（美容師）マスタ - id = auth.users(id)';
COMMENT ON TABLE sessions IS '施術セッション';
COMMENT ON TABLE transcripts IS '音声認識結果（ミリ秒単位）';
COMMENT ON TABLE speaker_segments IS '話者分離済み発話セグメント（ミリ秒単位）';
COMMENT ON TABLE session_analyses IS 'セッション分析結果（正規化: 指標タイプ×チャンク単位）';
COMMENT ON TABLE session_reports IS 'セッション終了後の詳細レポート';
COMMENT ON TABLE success_cases IS '成功事例DB（ベクトル検索用）';
COMMENT ON TABLE training_scenarios IS 'AIロールプレイ用シナリオ';
COMMENT ON TABLE roleplay_sessions IS 'ロールプレイセッション記録';
COMMENT ON TABLE push_tokens IS 'プッシュ通知トークン';
COMMENT ON TABLE notification_logs IS '通知送信履歴';
COMMENT ON TABLE staff_training_stats IS 'スタッフトレーニング統計';
COMMENT ON VIEW staff_performance IS 'スタッフパフォーマンス集計ビュー';
COMMENT ON VIEW salon_analytics IS '店舗分析集計ビュー';

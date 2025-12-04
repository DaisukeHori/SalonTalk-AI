-- ===========================================
-- SalonTalk AI - Initial Database Schema
-- ===========================================
-- Migration: 20241204000001_initial_schema
-- Description: Create initial tables for SalonTalk AI system
-- ===========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===========================================
-- 1. Salons (店舗)
-- ===========================================
CREATE TABLE salons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    plan TEXT NOT NULL DEFAULT 'standard' CHECK (plan IN ('free', 'standard', 'premium', 'enterprise')),
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

-- Index for quick lookup
CREATE INDEX idx_salons_plan ON salons(plan);

-- ===========================================
-- 2. Staffs (スタッフ)
-- ===========================================
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

-- Indexes
CREATE INDEX idx_staffs_salon_id ON staffs(salon_id);
CREATE INDEX idx_staffs_role ON staffs(role);
CREATE UNIQUE INDEX idx_staffs_email ON staffs(email);

-- ===========================================
-- 3. Sessions (セッション)
-- ===========================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    stylist_id UUID NOT NULL REFERENCES staffs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'analyzing', 'completed', 'error')),
    customer_info JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_salon_id ON sessions(salon_id);
CREATE INDEX idx_sessions_stylist_id ON sessions(stylist_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- ===========================================
-- 4. Speaker Segments (話者セグメント)
-- ===========================================
CREATE TABLE speaker_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('stylist', 'customer')),
    text TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_speaker_segments_session_id ON speaker_segments(session_id);
CREATE INDEX idx_speaker_segments_chunk ON speaker_segments(session_id, chunk_index);

-- ===========================================
-- 5. Analysis Results (分析結果)
-- ===========================================
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    metrics JSONB NOT NULL,
    suggestions TEXT[] DEFAULT '{}',
    highlights TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analysis_results_session_id ON analysis_results(session_id);
CREATE INDEX idx_analysis_results_chunk ON analysis_results(session_id, chunk_index);

-- ===========================================
-- 6. Success Cases (成功事例)
-- ===========================================
CREATE TABLE success_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    concern_keywords TEXT[] NOT NULL,
    approach_text TEXT NOT NULL,
    result TEXT NOT NULL,
    conversion_rate REAL,
    embedding VECTOR(1536),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_success_cases_salon_id ON success_cases(salon_id);
CREATE INDEX idx_success_cases_active ON success_cases(is_active) WHERE is_active = TRUE;

-- Vector index for similarity search
CREATE INDEX idx_success_cases_embedding ON success_cases
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ===========================================
-- 7. Reports (レポート)
-- ===========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    metrics JSONB NOT NULL,
    improvements TEXT[] DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    comparison_with_average JSONB DEFAULT '[]'::jsonb,
    matched_success_cases JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_reports_session_id ON reports(session_id);

-- ===========================================
-- 8. Training Scenarios (トレーニングシナリオ)
-- ===========================================
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

-- Index
CREATE INDEX idx_training_scenarios_salon_id ON training_scenarios(salon_id);
CREATE INDEX idx_training_scenarios_difficulty ON training_scenarios(difficulty);

-- ===========================================
-- 9. Roleplay Sessions (ロールプレイセッション)
-- ===========================================
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

-- Index
CREATE INDEX idx_roleplay_sessions_staff_id ON roleplay_sessions(staff_id);

-- ===========================================
-- Vector Search Function
-- ===========================================
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
LANGUAGE plpgsql
AS $$
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
        AND (salon_id IS NULL OR sc.salon_id = salon_id)
        AND 1 - (sc.embedding <=> query_embedding) > match_threshold
    ORDER BY sc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ===========================================
-- Updated At Trigger Function
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_salons_updated_at
    BEFORE UPDATE ON salons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staffs_updated_at
    BEFORE UPDATE ON staffs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_success_cases_updated_at
    BEFORE UPDATE ON success_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Row Level Security
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleplay_sessions ENABLE ROW LEVEL SECURITY;

-- Salons: Staff can only access their own salon
CREATE POLICY "salon_access" ON salons
    FOR ALL
    USING (
        id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    );

-- Staffs: Can view other staff in same salon
CREATE POLICY "staff_view_same_salon" ON staffs
    FOR SELECT
    USING (
        salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    );

-- Staffs: Can only update own profile
CREATE POLICY "staff_update_own" ON staffs
    FOR UPDATE
    USING (id = auth.uid());

-- Sessions: Same salon access
CREATE POLICY "session_access" ON sessions
    FOR ALL
    USING (
        salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    );

-- Speaker Segments: Via session
CREATE POLICY "speaker_segment_access" ON speaker_segments
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- Analysis Results: Via session
CREATE POLICY "analysis_result_access" ON analysis_results
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- Success Cases: Same salon access
CREATE POLICY "success_case_access" ON success_cases
    FOR ALL
    USING (
        salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    );

-- Reports: Via session
CREATE POLICY "report_access" ON reports
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- Training Scenarios: Same salon or system-wide (null salon_id)
CREATE POLICY "training_scenario_access" ON training_scenarios
    FOR SELECT
    USING (
        salon_id IS NULL OR
        salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
    );

-- Roleplay Sessions: Own sessions only
CREATE POLICY "roleplay_session_access" ON roleplay_sessions
    FOR ALL
    USING (staff_id = auth.uid());

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE salons IS '店舗マスタ';
COMMENT ON TABLE staffs IS 'スタッフ（美容師）マスタ';
COMMENT ON TABLE sessions IS '施術セッション';
COMMENT ON TABLE speaker_segments IS '話者分離済み発話セグメント';
COMMENT ON TABLE analysis_results IS 'AI分析結果（チャンク単位）';
COMMENT ON TABLE success_cases IS '成功事例DB（ベクトル検索用）';
COMMENT ON TABLE reports IS 'セッション終了後の詳細レポート';
COMMENT ON TABLE training_scenarios IS 'AIロールプレイ用シナリオ';
COMMENT ON TABLE roleplay_sessions IS 'ロールプレイセッション記録';

-- ===========================================
-- SalonTalk AI - Transcripts and Audio Tables
-- ===========================================
-- Migration: 20241204000004_add_transcripts_and_audio
-- Description: Add transcripts table and audio_chunks table
-- ===========================================

-- ===========================================
-- 1. Audio Chunks Table
-- ===========================================
CREATE TABLE IF NOT EXISTS audio_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    file_size_bytes INTEGER,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'diarizing', 'transcribing', 'completed', 'error')),
    diarization_job_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audio_chunks_session_id ON audio_chunks(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audio_chunks_unique ON audio_chunks(session_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_audio_chunks_status ON audio_chunks(status);

-- RLS
ALTER TABLE audio_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audio_chunk_access" ON audio_chunks
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 2. Transcripts Table
-- ===========================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    audio_chunk_id UUID REFERENCES audio_chunks(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    segment_index INTEGER NOT NULL,
    speaker TEXT NOT NULL CHECK (speaker IN ('stylist', 'customer', 'unknown')),
    speaker_label TEXT,
    text TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    language TEXT DEFAULT 'ja',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_audio_chunk ON transcripts(audio_chunk_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_chunk_segment ON transcripts(session_id, chunk_index, segment_index);
CREATE INDEX IF NOT EXISTS idx_transcripts_time ON transcripts(session_id, start_time_ms);

-- RLS
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transcript_access" ON transcripts
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 3. Session Concerns Table (Detected concerns per session)
-- ===========================================
CREATE TABLE IF NOT EXISTS session_concerns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    category TEXT,
    context TEXT,
    detected_at_ms INTEGER,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
    matched_success_case_id UUID REFERENCES success_cases(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_concerns_session_id ON session_concerns(session_id);
CREATE INDEX IF NOT EXISTS idx_session_concerns_keyword ON session_concerns(keyword);

-- RLS
ALTER TABLE session_concerns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_concern_access" ON session_concerns
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 4. Session Proposals Table (Product/service proposals per session)
-- ===========================================
CREATE TABLE IF NOT EXISTS session_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    proposed_at_ms INTEGER,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE SET NULL,
    related_concern_id UUID REFERENCES session_concerns(id) ON DELETE SET NULL,
    result TEXT CHECK (result IN ('pending', 'accepted', 'rejected', 'deferred')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_proposals_session_id ON session_proposals(session_id);

-- RLS
ALTER TABLE session_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_proposal_access" ON session_proposals
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 5. Get Session Transcript Function
-- ===========================================
CREATE OR REPLACE FUNCTION get_session_transcript(
    p_session_id UUID,
    p_chunk_index INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    chunk_index INTEGER,
    segment_index INTEGER,
    speaker TEXT,
    text TEXT,
    start_time_ms INTEGER,
    end_time_ms INTEGER,
    confidence REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.chunk_index,
        t.segment_index,
        t.speaker,
        t.text,
        t.start_time_ms,
        t.end_time_ms,
        t.confidence
    FROM transcripts t
    WHERE t.session_id = p_session_id
        AND (p_chunk_index IS NULL OR t.chunk_index = p_chunk_index)
    ORDER BY t.chunk_index, t.segment_index;
END;
$$;

-- ===========================================
-- 6. Get Session Summary Function
-- ===========================================
CREATE OR REPLACE FUNCTION get_session_summary(p_session_id UUID)
RETURNS TABLE (
    session_id UUID,
    staff_name TEXT,
    salon_name TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT,
    overall_score REAL,
    total_segments INTEGER,
    total_concerns INTEGER,
    total_proposals INTEGER,
    is_converted BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        st.name,
        sal.name,
        s.started_at,
        s.ended_at,
        s.total_duration_ms,
        s.status,
        COALESCE(AVG(sa.overall_score)::REAL, 0),
        COALESCE(COUNT(DISTINCT t.id)::INTEGER, 0),
        COALESCE(COUNT(DISTINCT sc.id)::INTEGER, 0),
        COALESCE(COUNT(DISTINCT sp.id)::INTEGER, 0),
        COALESCE(sr.is_converted, false)
    FROM sessions s
    JOIN staffs st ON st.id = s.stylist_id
    JOIN salons sal ON sal.id = s.salon_id
    LEFT JOIN session_analyses sa ON sa.session_id = s.id
    LEFT JOIN transcripts t ON t.session_id = s.id
    LEFT JOIN session_concerns sc ON sc.session_id = s.id
    LEFT JOIN session_proposals sp ON sp.session_id = s.id
    LEFT JOIN session_reports sr ON sr.session_id = s.id
    WHERE s.id = p_session_id
    GROUP BY s.id, st.name, sal.name, s.started_at, s.ended_at, s.total_duration_ms, s.status, sr.is_converted;
END;
$$;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE audio_chunks IS '音声チャンク（60秒区切り）';
COMMENT ON TABLE transcripts IS '話者分離済み書き起こしテキスト';
COMMENT ON TABLE session_concerns IS 'セッション中に検出された悩みキーワード';
COMMENT ON TABLE session_proposals IS 'セッション中の商品/サービス提案履歴';
COMMENT ON FUNCTION get_session_transcript IS 'セッション書き起こし取得関数';
COMMENT ON FUNCTION get_session_summary IS 'セッション概要取得関数';

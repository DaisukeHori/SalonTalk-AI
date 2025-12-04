-- ===========================================
-- SalonTalk AI - Storage and Schema Updates
-- ===========================================
-- Migration: 20241204000002_add_storage_and_updates
-- Description: Add storage bucket, update session and analysis tables
-- ===========================================

-- ===========================================
-- 1. Create Storage Bucket for Audio Chunks
-- ===========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-chunks',
    'audio-chunks',
    false,
    10485760, -- 10MB
    ARRAY['audio/wav', 'audio/mpeg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 2. Storage Policies
-- ===========================================

-- Allow authenticated users to upload audio chunks for their sessions
CREATE POLICY "upload_audio_chunks" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'audio-chunks' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (
            SELECT salon_id::text FROM staffs WHERE id = auth.uid()
        )
    );

-- Allow authenticated users to read audio chunks from their salon
CREATE POLICY "read_audio_chunks" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'audio-chunks' AND
        auth.role() = 'authenticated' AND
        (storage.foldername(name))[1] IN (
            SELECT salon_id::text FROM staffs WHERE id = auth.uid()
        )
    );

-- Allow service role full access
CREATE POLICY "service_role_audio_chunks" ON storage.objects
    FOR ALL
    USING (bucket_id = 'audio-chunks' AND auth.role() = 'service_role')
    WITH CHECK (bucket_id = 'audio-chunks' AND auth.role() = 'service_role');

-- ===========================================
-- 3. Add Missing Columns to Sessions
-- ===========================================

-- Add total_duration_ms if not exists (for session duration tracking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'total_duration_ms'
    ) THEN
        ALTER TABLE sessions ADD COLUMN total_duration_ms INTEGER;
    END IF;
END $$;

-- ===========================================
-- 4. Update Speaker Segments Table
-- ===========================================

-- Add chunk_index column for tracking which audio chunk the segment belongs to
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'speaker_segments' AND column_name = 'chunk_index'
    ) THEN
        ALTER TABLE speaker_segments ADD COLUMN chunk_index INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Allow 'unknown' as a valid speaker value
ALTER TABLE speaker_segments DROP CONSTRAINT IF EXISTS speaker_segments_speaker_check;
ALTER TABLE speaker_segments ADD CONSTRAINT speaker_segments_speaker_check
    CHECK (speaker IN ('stylist', 'customer', 'unknown'));

-- ===========================================
-- 5. Create Transcripts Table (Raw Speech-to-Text)
-- ===========================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL,
    end_time_ms INTEGER NOT NULL,
    audio_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_chunk ON transcripts(session_id, chunk_index);

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
-- 6. Create Session Notifications Table
-- ===========================================
CREATE TABLE IF NOT EXISTS session_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('proposal_chance', 'concern_detected', 'achievement', 'reminder')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_session_notifications_session_id ON session_notifications(session_id);

-- RLS
ALTER TABLE session_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_access" ON session_notifications
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM sessions
            WHERE salon_id IN (SELECT salon_id FROM staffs WHERE id = auth.uid())
        )
    );

-- ===========================================
-- 7. Update Analysis Results Table Structure
-- ===========================================

-- Add indicator_type column for storing individual indicator results
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analysis_results' AND column_name = 'indicator_type'
    ) THEN
        ALTER TABLE analysis_results ADD COLUMN indicator_type TEXT;
    END IF;
END $$;

-- ===========================================
-- 8. Create Function to Broadcast Analysis Results
-- ===========================================
CREATE OR REPLACE FUNCTION broadcast_analysis_result()
RETURNS TRIGGER AS $$
DECLARE
    channel_name TEXT;
BEGIN
    channel_name := 'session:' || NEW.session_id;

    -- Broadcast to Realtime channel
    PERFORM pg_notify(
        channel_name,
        json_build_object(
            'event', 'analysis',
            'payload', json_build_object(
                'chunkIndex', NEW.chunk_index,
                'overallScore', NEW.overall_score,
                'metrics', NEW.metrics
            )
        )::text
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for broadcasting
DROP TRIGGER IF EXISTS analysis_result_broadcast ON analysis_results;
CREATE TRIGGER analysis_result_broadcast
    AFTER INSERT ON analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION broadcast_analysis_result();

-- ===========================================
-- 9. Add Staff Performance Aggregation View
-- ===========================================
CREATE OR REPLACE VIEW staff_performance AS
SELECT
    s.id AS staff_id,
    s.salon_id,
    s.name,
    COUNT(DISTINCT sess.id) AS total_sessions,
    AVG(r.overall_score) AS avg_score,
    COALESCE(
        SUM(CASE WHEN (r.metrics->>'conversion')::jsonb->>'value' = '1' THEN 1 ELSE 0 END)::FLOAT /
        NULLIF(COUNT(DISTINCT sess.id), 0),
        0
    ) AS conversion_rate,
    MAX(sess.started_at) AS last_session_at
FROM staffs s
LEFT JOIN sessions sess ON sess.stylist_id = s.id AND sess.status = 'completed'
LEFT JOIN reports r ON r.session_id = sess.id
GROUP BY s.id, s.salon_id, s.name;

-- ===========================================
-- 10. Add Salon Analytics View
-- ===========================================
CREATE OR REPLACE VIEW salon_analytics AS
SELECT
    sal.id AS salon_id,
    sal.name AS salon_name,
    COUNT(DISTINCT s.id) AS active_staff,
    COUNT(DISTINCT sess.id) AS total_sessions,
    AVG(r.overall_score) AS avg_score,
    COALESCE(
        SUM(CASE WHEN (r.metrics->>'conversion')::jsonb->>'value' = '1' THEN 1 ELSE 0 END)::FLOAT /
        NULLIF(COUNT(DISTINCT sess.id), 0),
        0
    ) AS conversion_rate
FROM salons sal
LEFT JOIN staffs s ON s.salon_id = sal.id AND s.is_active = true
LEFT JOIN sessions sess ON sess.salon_id = sal.id AND sess.status = 'completed'
LEFT JOIN reports r ON r.session_id = sess.id
GROUP BY sal.id, sal.name;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE transcripts IS '音声認識結果（生テキスト）';
COMMENT ON TABLE session_notifications IS 'セッション中の通知履歴';
COMMENT ON VIEW staff_performance IS 'スタッフパフォーマンス集計ビュー';
COMMENT ON VIEW salon_analytics IS '店舗分析集計ビュー';

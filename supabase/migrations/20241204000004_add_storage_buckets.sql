-- ===========================================
-- SalonTalk AI - Storage Buckets Setup
-- ===========================================
-- Migration: 20241204000004_add_storage_buckets
-- Description: Create storage buckets for audio files
-- ===========================================

-- ===========================================
-- 1. Audio Chunks Bucket
-- ===========================================
-- Create the audio-chunks bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-chunks',
    'audio-chunks',
    false,
    52428800, -- 50MB limit
    ARRAY['audio/wav', 'audio/mpeg', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ===========================================
-- 2. Audio Chunks RLS Policies
-- ===========================================

-- Allow authenticated users to upload audio files for their sessions
CREATE POLICY "audio_chunks_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'audio-chunks'
        AND auth.role() = 'authenticated'
    );

-- Allow authenticated users to read audio files from their salon's sessions
CREATE POLICY "audio_chunks_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'audio-chunks'
        AND auth.role() = 'authenticated'
        AND (
            -- User can access if they belong to the same salon as the session
            EXISTS (
                SELECT 1 FROM sessions s
                JOIN staffs st ON st.salon_id = s.salon_id
                WHERE st.id = auth.uid()
                AND (storage.foldername(name))[1] = s.id::text
            )
        )
    );

-- Allow Edge Functions (service role) to manage audio files
CREATE POLICY "audio_chunks_service_all" ON storage.objects
    FOR ALL
    USING (
        bucket_id = 'audio-chunks'
        AND auth.role() = 'service_role'
    )
    WITH CHECK (
        bucket_id = 'audio-chunks'
        AND auth.role() = 'service_role'
    );

-- ===========================================
-- 3. Exports Bucket (for PDF/CSV exports)
-- ===========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'exports',
    'exports',
    false,
    104857600, -- 100MB limit
    ARRAY['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Exports bucket policies
CREATE POLICY "exports_insert_service" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'exports'
        AND auth.role() = 'service_role'
    );

CREATE POLICY "exports_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'exports'
        AND auth.role() = 'authenticated'
    );

-- ===========================================
-- 4. Avatars Bucket (for user profile images)
-- ===========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public bucket for avatars
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Avatars bucket policies
CREATE POLICY "avatars_insert_own" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "avatars_update_own" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Public read access for avatars
CREATE POLICY "avatars_public_select" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON TABLE storage.buckets IS 'Storage buckets for SalonTalk AI files';

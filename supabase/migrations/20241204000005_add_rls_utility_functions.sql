-- ===========================================
-- RLS Utility Functions
-- RLSユーティリティ関数
-- ===========================================

-- Get current user's staff ID from auth.uid()
-- 現在のユーザーのスタッフIDを取得
CREATE OR REPLACE FUNCTION get_current_staff_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM staffs WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Get current user's salon ID
-- 現在のユーザーの店舗IDを取得
CREATE OR REPLACE FUNCTION get_current_salon_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id FROM staffs WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Get current user's role
-- 現在のユーザーの役割を取得
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM staffs WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Check if current user is owner or manager
-- オーナーまたはマネージャーかどうか確認
CREATE OR REPLACE FUNCTION is_manager_or_owner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM staffs
    WHERE auth_user_id = auth.uid()
    AND role IN ('owner', 'manager')
  );
$$;

-- Check if current user can access a specific session
-- 特定のセッションにアクセス可能か確認
CREATE OR REPLACE FUNCTION can_access_session(session_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM sessions s
    JOIN staffs st ON s.salon_id = st.salon_id
    WHERE s.id = session_id_param
    AND st.auth_user_id = auth.uid()
  );
$$;

-- Check if user is the stylist of a session
-- セッションの担当スタイリストかどうか確認
CREATE OR REPLACE FUNCTION is_session_stylist(session_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM sessions s
    JOIN staffs st ON s.stylist_id = st.id
    WHERE s.id = session_id_param
    AND st.auth_user_id = auth.uid()
  );
$$;

-- ===========================================
-- Update RLS policies to use utility functions
-- ユーティリティ関数を使用してRLSポリシーを更新
-- ===========================================

-- Drop existing policies
DROP POLICY IF EXISTS "salon_access" ON salons;
DROP POLICY IF EXISTS "staff_view_same_salon" ON staffs;
DROP POLICY IF EXISTS "staff_update_own" ON staffs;
DROP POLICY IF EXISTS "session_access" ON sessions;
DROP POLICY IF EXISTS "speaker_segment_access" ON speaker_segments;
DROP POLICY IF EXISTS "analysis_result_access" ON analysis_results;
DROP POLICY IF EXISTS "success_case_access" ON success_cases;
DROP POLICY IF EXISTS "report_access" ON reports;
DROP POLICY IF EXISTS "training_scenario_access" ON training_scenarios;
DROP POLICY IF EXISTS "roleplay_session_access" ON roleplay_sessions;

-- Salons: Staff can only access their own salon
CREATE POLICY "salon_access" ON salons
    FOR ALL
    USING (id = get_current_salon_id());

-- Staffs: Can view other staff in same salon
CREATE POLICY "staff_view_same_salon" ON staffs
    FOR SELECT
    USING (salon_id = get_current_salon_id());

-- Staffs: Can only update own profile
CREATE POLICY "staff_update_own" ON staffs
    FOR UPDATE
    USING (auth_user_id = auth.uid());

-- Sessions: Same salon access
CREATE POLICY "session_access" ON sessions
    FOR ALL
    USING (salon_id = get_current_salon_id());

-- Speaker Segments: Via session salon check
CREATE POLICY "speaker_segment_access" ON speaker_segments
    FOR ALL
    USING (can_access_session(session_id));

-- Analysis Results: Via session salon check
CREATE POLICY "analysis_result_access" ON analysis_results
    FOR ALL
    USING (can_access_session(session_id));

-- Success Cases: Same salon access or public
CREATE POLICY "success_case_access" ON success_cases
    FOR SELECT
    USING (
        salon_id = get_current_salon_id() OR is_public = true
    );

CREATE POLICY "success_case_manage" ON success_cases
    FOR INSERT
    USING (salon_id = get_current_salon_id());

CREATE POLICY "success_case_update" ON success_cases
    FOR UPDATE
    USING (salon_id = get_current_salon_id());

CREATE POLICY "success_case_delete" ON success_cases
    FOR DELETE
    USING (salon_id = get_current_salon_id() AND is_manager_or_owner());

-- Reports: Via session
CREATE POLICY "report_access" ON reports
    FOR ALL
    USING (can_access_session(session_id));

-- Training Scenarios: Same salon or system-wide (null salon_id)
CREATE POLICY "training_scenario_access" ON training_scenarios
    FOR SELECT
    USING (
        salon_id IS NULL OR salon_id = get_current_salon_id()
    );

-- Roleplay Sessions: Own sessions only
CREATE POLICY "roleplay_session_access" ON roleplay_sessions
    FOR ALL
    USING (staff_id = get_current_staff_id());

-- ===========================================
-- Enable RLS on additional tables if not already
-- ===========================================
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Transcripts: Via session
CREATE POLICY "transcript_access" ON transcripts
    FOR ALL
    USING (can_access_session(session_id));

-- Session Analyses: Via session
CREATE POLICY "session_analysis_access" ON session_analyses
    FOR ALL
    USING (can_access_session(session_id));

-- Session Reports: Via session
CREATE POLICY "session_report_access" ON session_reports
    FOR ALL
    USING (can_access_session(session_id));

-- Push Tokens: Own tokens only
CREATE POLICY "push_token_access" ON push_tokens
    FOR ALL
    USING (staff_id = get_current_staff_id());

-- Notification Logs: Own notifications only
CREATE POLICY "notification_log_access" ON notification_logs
    FOR SELECT
    USING (staff_id = get_current_staff_id());

-- ===========================================
-- Grant permissions
-- ===========================================
GRANT EXECUTE ON FUNCTION get_current_staff_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_salon_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION is_manager_or_owner TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_session TO authenticated;
GRANT EXECUTE ON FUNCTION is_session_stylist TO authenticated;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON FUNCTION get_current_staff_id IS '現在のユーザーのスタッフIDを取得';
COMMENT ON FUNCTION get_current_salon_id IS '現在のユーザーの店舗IDを取得';
COMMENT ON FUNCTION get_current_user_role IS '現在のユーザーの役割を取得';
COMMENT ON FUNCTION is_manager_or_owner IS 'オーナーまたはマネージャーかどうか確認';
COMMENT ON FUNCTION can_access_session IS '特定のセッションにアクセス可能か確認';
COMMENT ON FUNCTION is_session_stylist IS 'セッションの担当スタイリストかどうか確認';

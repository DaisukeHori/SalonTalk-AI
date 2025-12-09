-- ===========================================
-- SalonTalk AI - Operator Management Tables
-- ===========================================
-- Migration: Add operator_admins, audit_logs and salons extensions
-- Date: 2025-12-09
-- ===========================================

-- ============================================================
-- 1. salons テーブルの拡張（停止機能用カラム追加）
-- ============================================================

-- status カラム追加（停止機能用）
ALTER TABLE salons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- status カラムにチェック制約追加（既存の場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'salons_status_check'
  ) THEN
    ALTER TABLE salons ADD CONSTRAINT salons_status_check
      CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- 停止関連カラム追加
ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE salons ADD COLUMN IF NOT EXISTS internal_note TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_plan ON salons(plan);

COMMENT ON COLUMN salons.status IS 'Salon status: active or suspended';
COMMENT ON COLUMN salons.suspended_at IS 'Timestamp when salon was suspended';
COMMENT ON COLUMN salons.suspended_reason IS 'Reason shown to users when suspended';
COMMENT ON COLUMN salons.internal_note IS 'Internal operator notes';

-- ============================================================
-- 2. operator_admins テーブル（運営ユーザー）
-- ============================================================

CREATE TABLE IF NOT EXISTS operator_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator_support'
    CHECK (role IN ('operator_admin', 'operator_support')),
  mfa_secret TEXT,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_operator_admins_email ON operator_admins(email);
CREATE INDEX IF NOT EXISTS idx_operator_admins_active ON operator_admins(is_active) WHERE is_active = TRUE;

-- 更新日時自動更新トリガー
DROP TRIGGER IF EXISTS trigger_operator_admins_updated_at ON operator_admins;
CREATE TRIGGER trigger_operator_admins_updated_at
  BEFORE UPDATE ON operator_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE operator_admins IS 'SalonTalk AI operator (admin/support staff) accounts';
COMMENT ON COLUMN operator_admins.role IS 'operator_admin: full access, operator_support: limited access';
COMMENT ON COLUMN operator_admins.mfa_secret IS 'TOTP secret for MFA (encrypted)';

-- ============================================================
-- 3. audit_logs テーブル（監査ログ）
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operator_admins(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('salon', 'operator', 'system')),
  target_id UUID,
  target_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_operator_id ON audit_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_name ON audit_logs(target_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_search ON audit_logs(created_at DESC, action, target_type);

COMMENT ON TABLE audit_logs IS 'Audit trail for all operator actions';
COMMENT ON COLUMN audit_logs.action IS 'Action type: seats_change, plan_change, suspend, unsuspend, etc.';
COMMENT ON COLUMN audit_logs.details IS 'JSON with before/after values and reason';

-- ============================================================
-- 4. RLS ポリシー
-- ============================================================

-- operator_admins: service_role のみアクセス可能
ALTER TABLE operator_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_admins_service_all" ON operator_admins;
CREATE POLICY "operator_admins_service_all" ON operator_admins
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- audit_logs: service_role のみ挿入可能、閲覧は運営者のみ
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_service_insert" ON audit_logs;
CREATE POLICY "audit_logs_service_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "audit_logs_service_select" ON audit_logs;
CREATE POLICY "audit_logs_service_select" ON audit_logs
  FOR SELECT USING (auth.role() = 'service_role');

-- ============================================================
-- 5. 監査ログ記録関数
-- ============================================================

CREATE OR REPLACE FUNCTION record_audit_log(
  p_operator_id UUID,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_target_name TEXT,
  p_details JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    operator_id, action, target_type, target_id,
    target_name, details, ip_address, user_agent
  )
  VALUES (
    p_operator_id, p_action, p_target_type, p_target_id,
    p_target_name, p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION record_audit_log IS 'Record an audit log entry for operator actions';

-- ============================================================
-- 6. 座席枠変更関数（監査ログ付き）
-- ============================================================

CREATE OR REPLACE FUNCTION admin_update_salon_seats(
  p_operator_id UUID,
  p_salon_id UUID,
  p_new_seats_count INTEGER,
  p_reason TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_seats_count INTEGER,
  new_seats_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon RECORD;
  v_active_devices INTEGER;
BEGIN
  -- バリデーション
  IF p_new_seats_count < 1 OR p_new_seats_count > 100 THEN
    RETURN QUERY SELECT false, 'seats_count must be between 1 and 100'::TEXT, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF LENGTH(COALESCE(p_reason, '')) < 10 THEN
    RETURN QUERY SELECT false, 'reason must be at least 10 characters'::TEXT, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  -- サロン取得
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF v_salon IS NULL THEN
    RETURN QUERY SELECT false, 'Salon not found'::TEXT, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  -- アクティブデバイス数チェック
  SELECT COUNT(*) INTO v_active_devices
  FROM devices
  WHERE salon_id = p_salon_id AND status = 'active';

  IF p_new_seats_count < v_active_devices THEN
    RETURN QUERY SELECT false,
      format('Cannot reduce seats below active device count (%s)', v_active_devices)::TEXT,
      v_salon.seats_count, p_new_seats_count;
    RETURN;
  END IF;

  -- 更新
  UPDATE salons
  SET seats_count = p_new_seats_count, updated_at = NOW()
  WHERE id = p_salon_id;

  -- 監査ログ記録
  PERFORM record_audit_log(
    p_operator_id,
    'seats_change',
    'salon',
    p_salon_id,
    v_salon.name,
    jsonb_build_object(
      'before', jsonb_build_object('seats_count', v_salon.seats_count),
      'after', jsonb_build_object('seats_count', p_new_seats_count),
      'reason', p_reason
    ),
    p_ip_address,
    p_user_agent
  );

  RETURN QUERY SELECT true, 'Seats updated successfully'::TEXT, v_salon.seats_count, p_new_seats_count;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_salon_seats TO service_role;

-- ============================================================
-- 7. プラン変更関数（監査ログ付き）
-- ============================================================

CREATE OR REPLACE FUNCTION admin_update_salon_plan(
  p_operator_id UUID,
  p_salon_id UUID,
  p_new_plan TEXT,
  p_reason TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  previous_plan TEXT,
  new_plan TEXT,
  seats_adjusted BOOLEAN,
  new_seats_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon RECORD;
  v_plan_limits JSONB := '{
    "free": 2,
    "standard": 5,
    "premium": 15,
    "enterprise": 100
  }'::JSONB;
  v_new_limit INTEGER;
  v_adjusted BOOLEAN := false;
  v_final_seats INTEGER;
BEGIN
  -- バリデーション
  IF p_new_plan NOT IN ('free', 'standard', 'premium', 'enterprise') THEN
    RETURN QUERY SELECT false, 'Invalid plan'::TEXT, NULL::TEXT, NULL::TEXT, false, NULL::INTEGER;
    RETURN;
  END IF;

  -- サロン取得
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF v_salon IS NULL THEN
    RETURN QUERY SELECT false, 'Salon not found'::TEXT, NULL::TEXT, NULL::TEXT, false, NULL::INTEGER;
    RETURN;
  END IF;

  -- 新プランの座席上限取得
  v_new_limit := (v_plan_limits ->> p_new_plan)::INTEGER;
  v_final_seats := v_salon.seats_count;

  -- ダウングレード時の座席数調整
  IF v_salon.seats_count > v_new_limit THEN
    v_final_seats := v_new_limit;
    v_adjusted := true;
  END IF;

  -- 更新
  UPDATE salons
  SET
    plan = p_new_plan,
    seats_count = v_final_seats,
    updated_at = NOW()
  WHERE id = p_salon_id;

  -- 監査ログ記録
  PERFORM record_audit_log(
    p_operator_id,
    'plan_change',
    'salon',
    p_salon_id,
    v_salon.name,
    jsonb_build_object(
      'before', jsonb_build_object('plan', v_salon.plan, 'seats_count', v_salon.seats_count),
      'after', jsonb_build_object('plan', p_new_plan, 'seats_count', v_final_seats),
      'reason', p_reason,
      'seats_adjusted', v_adjusted
    ),
    p_ip_address,
    p_user_agent
  );

  RETURN QUERY SELECT true, 'Plan updated successfully'::TEXT, v_salon.plan, p_new_plan, v_adjusted, v_final_seats;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_salon_plan TO service_role;

-- ============================================================
-- 8. サロン停止/再開関数（監査ログ付き）
-- ============================================================

CREATE OR REPLACE FUNCTION admin_suspend_salon(
  p_operator_id UUID,
  p_salon_id UUID,
  p_reason TEXT,
  p_internal_note TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon RECORD;
BEGIN
  -- サロン取得
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF v_salon IS NULL THEN
    RETURN QUERY SELECT false, 'Salon not found'::TEXT;
    RETURN;
  END IF;

  IF v_salon.status = 'suspended' THEN
    RETURN QUERY SELECT false, 'Salon is already suspended'::TEXT;
    RETURN;
  END IF;

  -- 停止
  UPDATE salons
  SET
    status = 'suspended',
    suspended_at = NOW(),
    suspended_reason = p_reason,
    internal_note = COALESCE(p_internal_note, internal_note),
    updated_at = NOW()
  WHERE id = p_salon_id;

  -- 監査ログ記録
  PERFORM record_audit_log(
    p_operator_id,
    'suspend',
    'salon',
    p_salon_id,
    v_salon.name,
    jsonb_build_object(
      'reason', p_reason,
      'internal_note', p_internal_note
    ),
    p_ip_address,
    p_user_agent
  );

  RETURN QUERY SELECT true, 'Salon suspended successfully'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION admin_unsuspend_salon(
  p_operator_id UUID,
  p_salon_id UUID,
  p_note TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon RECORD;
BEGIN
  -- サロン取得
  SELECT * INTO v_salon FROM salons WHERE id = p_salon_id;
  IF v_salon IS NULL THEN
    RETURN QUERY SELECT false, 'Salon not found'::TEXT;
    RETURN;
  END IF;

  IF v_salon.status = 'active' THEN
    RETURN QUERY SELECT false, 'Salon is not suspended'::TEXT;
    RETURN;
  END IF;

  -- 再開
  UPDATE salons
  SET
    status = 'active',
    suspended_at = NULL,
    suspended_reason = NULL,
    updated_at = NOW()
  WHERE id = p_salon_id;

  -- 監査ログ記録
  PERFORM record_audit_log(
    p_operator_id,
    'unsuspend',
    'salon',
    p_salon_id,
    v_salon.name,
    jsonb_build_object(
      'note', p_note,
      'was_suspended_at', v_salon.suspended_at,
      'was_suspended_reason', v_salon.suspended_reason
    ),
    p_ip_address,
    p_user_agent
  );

  RETURN QUERY SELECT true, 'Salon unsuspended successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_suspend_salon TO service_role;
GRANT EXECUTE ON FUNCTION admin_unsuspend_salon TO service_role;

-- ============================================================
-- 9. サロン統計取得関数
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_salon_stats(p_salon_id UUID)
RETURNS TABLE (
  staff_count BIGINT,
  active_device_count BIGINT,
  total_sessions BIGINT,
  sessions_this_month BIGINT,
  last_session_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM staffs WHERE salon_id = p_salon_id AND is_active = true),
    (SELECT COUNT(*) FROM devices WHERE salon_id = p_salon_id AND status = 'active'),
    (SELECT COUNT(*) FROM sessions WHERE salon_id = p_salon_id),
    (SELECT COUNT(*) FROM sessions WHERE salon_id = p_salon_id AND started_at >= date_trunc('month', NOW())),
    (SELECT MAX(started_at) FROM sessions WHERE salon_id = p_salon_id);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_salon_stats TO service_role;

-- ============================================================
-- 10. ダッシュボード統計取得関数
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS TABLE (
  total_salons BIGINT,
  active_salons BIGINT,
  suspended_salons BIGINT,
  total_staff BIGINT,
  total_devices BIGINT,
  active_devices BIGINT,
  new_salons_today BIGINT,
  sessions_today BIGINT,
  plan_free BIGINT,
  plan_standard BIGINT,
  plan_premium BIGINT,
  plan_enterprise BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM salons),
    (SELECT COUNT(*) FROM salons WHERE status = 'active'),
    (SELECT COUNT(*) FROM salons WHERE status = 'suspended'),
    (SELECT COUNT(*) FROM staffs WHERE is_active = true),
    (SELECT COUNT(*) FROM devices),
    (SELECT COUNT(*) FROM devices WHERE status = 'active'),
    (SELECT COUNT(*) FROM salons WHERE created_at >= date_trunc('day', NOW())),
    (SELECT COUNT(*) FROM sessions WHERE started_at >= date_trunc('day', NOW())),
    (SELECT COUNT(*) FROM salons WHERE plan = 'free'),
    (SELECT COUNT(*) FROM salons WHERE plan = 'standard'),
    (SELECT COUNT(*) FROM salons WHERE plan = 'premium'),
    (SELECT COUNT(*) FROM salons WHERE plan = 'enterprise');
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats TO service_role;

-- ============================================================
-- Done
-- ============================================================

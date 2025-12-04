-- ===========================================
-- SalonTalk AI - Security Functions
-- ===========================================
-- Migration: 20241204000004_security_functions
-- Description: Add anonymize_text function for personal data protection
--              as per 要件定義書 10.2 SEC-D02
-- ===========================================

-- ===========================================
-- 1. Anonymize Text Function (SEC-D02)
-- ===========================================
CREATE OR REPLACE FUNCTION anonymize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;

  -- 氏名パターンのマスキング (Japanese names with honorifics)
  input_text := regexp_replace(
    input_text,
    '[一-龯ぁ-んァ-ヶー]{2,4}(さん|様|氏)',
    '○○様',
    'g'
  );

  -- 電話番号のマスキング (Phone numbers)
  input_text := regexp_replace(
    input_text,
    '\d{2,4}-\d{2,4}-\d{4}',
    '***-****-****',
    'g'
  );

  -- 携帯電話番号のマスキング (Mobile phone numbers)
  input_text := regexp_replace(
    input_text,
    '0[789]0-?\d{4}-?\d{4}',
    '***-****-****',
    'g'
  );

  -- 郵便番号のマスキング (Postal codes)
  input_text := regexp_replace(
    input_text,
    '\d{3}-\d{4}',
    '***-****',
    'g'
  );

  -- メールアドレスのマスキング (Email addresses)
  input_text := regexp_replace(
    input_text,
    '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
    '***@***.***',
    'g'
  );

  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===========================================
-- 2. Audit Log Trigger Function
-- ===========================================
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  -- Determine the action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data
  ) VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_old_data,
    v_new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. Add Audit Triggers to Important Tables
-- ===========================================
-- Note: Only add to tables that need audit logging

DO $$
BEGIN
  -- Audit trigger for staffs table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_staffs') THEN
    CREATE TRIGGER audit_staffs
      AFTER INSERT OR UPDATE OR DELETE ON staffs
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_event();
  END IF;

  -- Audit trigger for salons table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_salons') THEN
    CREATE TRIGGER audit_salons
      AFTER INSERT OR UPDATE OR DELETE ON salons
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_event();
  END IF;

  -- Audit trigger for success_cases table
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_success_cases') THEN
    CREATE TRIGGER audit_success_cases
      AFTER INSERT OR UPDATE OR DELETE ON success_cases
      FOR EACH ROW
      EXECUTE FUNCTION log_audit_event();
  END IF;
END $$;

-- ===========================================
-- 4. Data Retention Cleanup Function (SEC-D03)
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
  v_audio_retention INTERVAL := INTERVAL '0 days'; -- Immediate deletion after processing
  v_log_retention INTERVAL := INTERVAL '1 year';
  v_data_retention INTERVAL := INTERVAL '6 years';
BEGIN
  -- Clean up old audit logs (1 year retention)
  DELETE FROM audit_logs
  WHERE created_at < NOW() - v_log_retention;

  -- Clean up old notification logs (1 year retention)
  DELETE FROM notification_logs
  WHERE sent_at < NOW() - v_log_retention;

  -- Note: Session data, reports, analysis results have 6 year retention
  -- and should be cleaned up by a separate scheduled job

  RAISE NOTICE 'Data cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Comments
-- ===========================================
COMMENT ON FUNCTION anonymize_text IS '個人情報マスキング関数（SEC-D02準拠）';
COMMENT ON FUNCTION log_audit_event IS '監査ログ記録トリガー関数';
COMMENT ON FUNCTION cleanup_old_data IS 'データ保持ポリシーに基づく古いデータ削除';

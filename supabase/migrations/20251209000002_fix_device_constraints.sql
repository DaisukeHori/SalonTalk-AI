-- ===========================================
-- SalonTalk AI - Fix Device Constraints & Add Audit
-- ===========================================
-- Migration: Fix issues from design review
-- Date: 2025-12-09
-- ===========================================

-- ============================================================
-- 1. 重大: device_activations に一意制約追加
-- ============================================================

-- 未使用のアクティベーションコードは一意
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_activations_code_unique
  ON device_activations(activation_code)
  WHERE used_at IS NULL;

-- 数字のみチェック制約追加
ALTER TABLE device_activations
  ADD CONSTRAINT device_activations_code_numeric
  CHECK (activation_code ~ '^[0-9]{6}$');

COMMENT ON CONSTRAINT device_activations_code_numeric ON device_activations
  IS 'Activation code must be exactly 6 digits';

-- ============================================================
-- 2. 重大: device_seat_history テーブル追加（変更履歴）
-- ============================================================

CREATE TABLE IF NOT EXISTS device_seat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  previous_seat_number INTEGER,
  new_seat_number INTEGER,
  changed_by UUID REFERENCES staffs(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_device_seat_history_device_id
  ON device_seat_history(device_id);
CREATE INDEX IF NOT EXISTS idx_device_seat_history_changed_at
  ON device_seat_history(changed_at DESC);

COMMENT ON TABLE device_seat_history IS 'Audit log for device seat number changes';

-- RLS for device_seat_history
ALTER TABLE device_seat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seat_history_select" ON device_seat_history
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM devices WHERE salon_id = get_current_user_salon_id()
    )
  );

CREATE POLICY "seat_history_insert" ON device_seat_history
  FOR INSERT WITH CHECK (
    device_id IN (
      SELECT id FROM devices WHERE salon_id = get_current_user_salon_id()
    )
  );

-- Service role access
CREATE POLICY "service_seat_history_all" ON device_seat_history
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger for automatic history recording
CREATE OR REPLACE FUNCTION record_seat_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.seat_number IS DISTINCT FROM NEW.seat_number THEN
    INSERT INTO device_seat_history (device_id, previous_seat_number, new_seat_number)
    VALUES (NEW.id, OLD.seat_number, NEW.seat_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_record_seat_change ON devices;
CREATE TRIGGER trigger_record_seat_change
  AFTER UPDATE OF seat_number ON devices
  FOR EACH ROW
  EXECUTE FUNCTION record_seat_change();

-- ============================================================
-- 3. 中: devices.device_identifier に一意制約追加
-- ============================================================

-- device_identifier はグローバルに一意（NULL許可）
ALTER TABLE devices
  ADD CONSTRAINT devices_identifier_unique UNIQUE (device_identifier);

-- ============================================================
-- 4. 中: idx_devices_last_active インデックス追加
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_devices_last_active
  ON devices(last_active_at DESC NULLS LAST);

-- ============================================================
-- 5. セット面番号変更関数
-- ============================================================

CREATE OR REPLACE FUNCTION update_device_seat(
  device_id_param UUID,
  new_seat_number_param INTEGER,
  changed_by_param UUID DEFAULT NULL,
  reason_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  previous_seat INTEGER,
  new_seat INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_seat INTEGER;
  device_salon UUID;
BEGIN
  -- Get current seat and salon
  SELECT seat_number, salon_id
  INTO current_seat, device_salon
  FROM devices
  WHERE id = device_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::INTEGER, NULL::INTEGER, 'Device not found'::TEXT;
    RETURN;
  END IF;

  -- Check for duplicate seat number in same salon
  IF new_seat_number_param IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM devices
      WHERE salon_id = device_salon
        AND seat_number = new_seat_number_param
        AND id != device_id_param
    ) THEN
      RETURN QUERY SELECT false, current_seat, new_seat_number_param, 'Seat number already in use'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Update seat number (trigger will record history)
  UPDATE devices
  SET seat_number = new_seat_number_param, updated_at = NOW()
  WHERE id = device_id_param;

  -- Update history with changed_by and reason
  UPDATE device_seat_history
  SET changed_by = changed_by_param, reason = reason_param
  WHERE device_id = device_id_param
    AND changed_at = (SELECT MAX(changed_at) FROM device_seat_history WHERE device_id = device_id_param);

  RETURN QUERY SELECT true, current_seat, new_seat_number_param, 'Seat updated successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION update_device_seat TO authenticated;

COMMENT ON FUNCTION update_device_seat IS 'Update device seat number with audit trail';

-- ============================================================
-- Done
-- ============================================================

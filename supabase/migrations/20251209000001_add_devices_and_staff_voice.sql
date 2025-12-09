-- ===========================================
-- SalonTalk AI - Device Management & Staff Voice Recognition
-- ===========================================
-- Migration: Add devices, device_activations tables
--            Extend staffs table with voice embedding
--            Extend sessions table with device_id
-- Date: 2025-12-09
-- ===========================================

-- ============================================================
-- 1. Extend staffs table for voice recognition
-- ============================================================

-- Add voice recognition columns to staffs
ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS voice_embedding VECTOR(512),
ADD COLUMN IF NOT EXISTS voice_registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voice_sample_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT false;

-- Add HNSW index for staff voice embedding search
CREATE INDEX IF NOT EXISTS idx_staffs_voice_embedding ON staffs
  USING hnsw (voice_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON COLUMN staffs.voice_embedding IS 'Staff voice embedding vector (pyannote 512-dim)';
COMMENT ON COLUMN staffs.voice_registered_at IS 'Voice registration timestamp';
COMMENT ON COLUMN staffs.voice_sample_count IS 'Number of voice samples for quality improvement';
COMMENT ON COLUMN staffs.setup_completed IS 'Initial setup completed flag';

-- ============================================================
-- 2. Create devices table
-- ============================================================

-- Device status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_status') THEN
    CREATE TYPE device_status AS ENUM ('pending', 'active', 'inactive', 'revoked');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  device_name VARCHAR(100) NOT NULL,
  device_identifier VARCHAR(255),
  status device_status NOT NULL DEFAULT 'pending',
  seat_number INTEGER,
  last_active_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES staffs(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT devices_salon_name_unique UNIQUE (salon_id, device_name),
  CONSTRAINT devices_seat_number_unique UNIQUE (salon_id, seat_number)
);

-- Indexes for devices
CREATE INDEX IF NOT EXISTS idx_devices_salon_id ON devices(salon_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_salon_active ON devices(salon_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_devices_identifier ON devices(device_identifier) WHERE device_identifier IS NOT NULL;

-- Updated at trigger for devices
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE devices IS 'iPad device management';
COMMENT ON COLUMN devices.device_name IS 'Display name (e.g. "Seat 1 iPad")';
COMMENT ON COLUMN devices.device_identifier IS 'Device unique ID (UDID etc.)';
COMMENT ON COLUMN devices.seat_number IS 'Optional seat number';

-- ============================================================
-- 3. Create device_activations table
-- ============================================================

CREATE TABLE IF NOT EXISTS device_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  activation_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT device_activations_not_expired CHECK (expires_at > created_at)
);

-- Indexes for device_activations
CREATE INDEX IF NOT EXISTS idx_device_activations_device_id ON device_activations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_activations_code ON device_activations(activation_code) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_device_activations_expires ON device_activations(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE device_activations IS 'Device activation codes (6-digit, 24h validity)';
COMMENT ON COLUMN device_activations.activation_code IS '6-digit numeric activation code';

-- ============================================================
-- 4. Extend sessions table
-- ============================================================

-- Add device_id column to sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS stylist_match_confidence REAL;

-- Make stylist_id nullable for auto-identification
ALTER TABLE sessions
ALTER COLUMN stylist_id DROP NOT NULL;

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(device_id, status) WHERE status = 'recording';

COMMENT ON COLUMN sessions.device_id IS 'Device that started the session';
COMMENT ON COLUMN sessions.stylist_match_confidence IS 'Staff voice matching confidence (0-1)';

-- ============================================================
-- 5. RLS Policies for devices
-- ============================================================

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activations ENABLE ROW LEVEL SECURITY;

-- devices policies
DROP POLICY IF EXISTS "device_select" ON devices;
CREATE POLICY "device_select" ON devices
  FOR SELECT USING (salon_id = get_current_salon_id());

DROP POLICY IF EXISTS "device_insert" ON devices;
CREATE POLICY "device_insert" ON devices
  FOR INSERT WITH CHECK (
    salon_id = get_current_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "device_update" ON devices;
CREATE POLICY "device_update" ON devices
  FOR UPDATE USING (
    salon_id = get_current_salon_id()
    AND get_current_user_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "device_delete" ON devices;
CREATE POLICY "device_delete" ON devices
  FOR DELETE USING (
    salon_id = get_current_salon_id()
    AND get_current_user_role() = 'owner'
  );

-- device_activations policies
DROP POLICY IF EXISTS "device_activation_select" ON device_activations;
CREATE POLICY "device_activation_select" ON device_activations
  FOR SELECT USING (
    device_id IN (
      SELECT id FROM devices WHERE salon_id = get_current_salon_id()
    )
  );

DROP POLICY IF EXISTS "device_activation_insert" ON device_activations;
CREATE POLICY "device_activation_insert" ON device_activations
  FOR INSERT WITH CHECK (
    device_id IN (
      SELECT id FROM devices WHERE salon_id = get_current_salon_id()
    )
    AND get_current_user_role() IN ('owner', 'manager')
  );

DROP POLICY IF EXISTS "device_activation_update" ON device_activations;
CREATE POLICY "device_activation_update" ON device_activations
  FOR UPDATE USING (
    device_id IN (
      SELECT id FROM devices WHERE salon_id = get_current_salon_id()
    )
    AND get_current_user_role() IN ('owner', 'manager')
  );

-- ============================================================
-- 6. Service role policies for device authentication
-- ============================================================

-- Allow service role to read/update devices (for activation endpoint)
DROP POLICY IF EXISTS "service_device_all" ON devices;
CREATE POLICY "service_device_all" ON devices
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service_activation_all" ON device_activations;
CREATE POLICY "service_activation_all" ON device_activations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 7. Staff voice matching function
-- ============================================================

CREATE OR REPLACE FUNCTION match_staff_by_voice(
  query_embedding VECTOR(512),
  salon_id_param UUID,
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  staff_id UUID,
  name TEXT,
  similarity FLOAT,
  confidence_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS staff_id,
    s.name,
    1 - (s.voice_embedding <=> query_embedding) AS similarity,
    CASE
      WHEN 1 - (s.voice_embedding <=> query_embedding) >= 0.85 THEN 'high'
      WHEN 1 - (s.voice_embedding <=> query_embedding) >= 0.75 THEN 'medium'
      ELSE 'low'
    END AS confidence_level
  FROM staffs s
  WHERE
    s.salon_id = salon_id_param
    AND s.is_active = true
    AND s.voice_embedding IS NOT NULL
    AND 1 - (s.voice_embedding <=> query_embedding) > match_threshold
  ORDER BY s.voice_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_staff_by_voice IS 'Match staff by voice embedding similarity';

-- ============================================================
-- 8. Staff voice registration function
-- ============================================================

CREATE OR REPLACE FUNCTION register_staff_voice(
  staff_id_param UUID,
  embedding_param VECTOR(512),
  is_additional BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  sample_count INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_embedding VECTOR(512);
  current_sample_count INTEGER;
  weight FLOAT;
BEGIN
  -- Get current voice info
  SELECT voice_embedding, voice_sample_count
  INTO current_embedding, current_sample_count
  FROM staffs
  WHERE id = staff_id_param;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Staff not found'::TEXT;
    RETURN;
  END IF;

  IF current_embedding IS NULL OR NOT is_additional THEN
    -- Initial registration or overwrite
    UPDATE staffs
    SET
      voice_embedding = embedding_param,
      voice_registered_at = NOW(),
      voice_sample_count = 1,
      updated_at = NOW()
    WHERE id = staff_id_param;

    RETURN QUERY SELECT true, 1, 'Voice registered'::TEXT;
  ELSE
    -- Additional sample with weighted average
    -- Weight decreases as samples increase (max 0.2)
    weight := LEAST(1.0 / (current_sample_count + 1), 0.2);

    UPDATE staffs
    SET
      voice_embedding = (
        (1 - weight) * current_embedding::vector + weight * embedding_param::vector
      )::VECTOR(512),
      voice_sample_count = current_sample_count + 1,
      updated_at = NOW()
    WHERE id = staff_id_param;

    RETURN QUERY SELECT true, current_sample_count + 1,
      format('Voice updated (samples: %s)', current_sample_count + 1)::TEXT;
  END IF;
END;
$$;

COMMENT ON FUNCTION register_staff_voice IS 'Register or update staff voice embedding';

-- ============================================================
-- 9. Activation code generation function
-- ============================================================

CREATE OR REPLACE FUNCTION generate_activation_code(
  device_id_param UUID,
  created_by_param UUID,
  validity_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  activation_code VARCHAR(6),
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code VARCHAR(6);
  new_expires_at TIMESTAMPTZ;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  new_expires_at := NOW() + (validity_hours || ' hours')::INTERVAL;

  -- Generate unique code with retry
  LOOP
    attempt := attempt + 1;
    -- Generate 6-digit numeric code
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Check for duplicates in unused, non-expired codes
    IF NOT EXISTS (
      SELECT 1 FROM device_activations
      WHERE device_activations.activation_code = new_code
        AND used_at IS NULL
        AND device_activations.expires_at > NOW()
    ) THEN
      EXIT;
    END IF;

    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate activation code';
    END IF;
  END LOOP;

  -- Invalidate existing unused codes for this device
  UPDATE device_activations
  SET expires_at = NOW()
  WHERE device_activations.device_id = device_id_param
    AND used_at IS NULL
    AND device_activations.expires_at > NOW();

  -- Insert new code
  INSERT INTO device_activations (device_id, activation_code, expires_at, created_by)
  VALUES (device_id_param, new_code, new_expires_at, created_by_param);

  RETURN QUERY SELECT new_code, new_expires_at;
END;
$$;

COMMENT ON FUNCTION generate_activation_code IS 'Generate 6-digit device activation code';

-- ============================================================
-- 10. Device activation function
-- ============================================================

CREATE OR REPLACE FUNCTION activate_device(
  activation_code_param VARCHAR(6),
  device_identifier_param VARCHAR(255),
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  success BOOLEAN,
  device_id UUID,
  salon_id UUID,
  device_name VARCHAR,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activation_record RECORD;
BEGIN
  -- Validate activation code
  SELECT da.*, d.salon_id AS d_salon_id, d.device_name AS d_device_name
  INTO activation_record
  FROM device_activations da
  JOIN devices d ON d.id = da.device_id
  WHERE da.activation_code = activation_code_param
    AND da.used_at IS NULL
    AND da.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::VARCHAR,
      'Invalid or expired activation code'::TEXT;
    RETURN;
  END IF;

  -- Activate device
  UPDATE devices
  SET
    status = 'active',
    device_identifier = device_identifier_param,
    activated_at = NOW(),
    last_active_at = NOW(),
    metadata = metadata_param,
    updated_at = NOW()
  WHERE id = activation_record.device_id;

  -- Mark activation code as used
  UPDATE device_activations
  SET used_at = NOW()
  WHERE id = activation_record.id;

  RETURN QUERY SELECT
    true,
    activation_record.device_id,
    activation_record.d_salon_id,
    activation_record.d_device_name::VARCHAR,
    'Device activated successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION activate_device IS 'Activate device with 6-digit code';

-- ============================================================
-- 11. Device authentication function (app startup)
-- ============================================================

CREATE OR REPLACE FUNCTION authenticate_device(
  device_identifier_param VARCHAR(255)
)
RETURNS TABLE (
  is_valid BOOLEAN,
  device_id UUID,
  salon_id UUID,
  device_name VARCHAR,
  seat_number INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  device_record RECORD;
BEGIN
  -- Find active device
  SELECT d.id, d.salon_id, d.device_name, d.seat_number
  INTO device_record
  FROM devices d
  WHERE d.device_identifier = device_identifier_param
    AND d.status = 'active';

  IF FOUND THEN
    -- Update last active time
    UPDATE devices
    SET last_active_at = NOW()
    WHERE id = device_record.id;

    RETURN QUERY SELECT
      true AS is_valid,
      device_record.id AS device_id,
      device_record.salon_id,
      device_record.device_name::VARCHAR,
      device_record.seat_number;
  ELSE
    RETURN QUERY SELECT
      false AS is_valid,
      NULL::UUID AS device_id,
      NULL::UUID AS salon_id,
      NULL::VARCHAR AS device_name,
      NULL::INTEGER AS seat_number;
  END IF;
END;
$$;

COMMENT ON FUNCTION authenticate_device IS 'Authenticate device on app startup';

-- ============================================================
-- 12. Grant execute permissions
-- ============================================================

GRANT EXECUTE ON FUNCTION match_staff_by_voice TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION register_staff_voice TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_activation_code TO authenticated;
GRANT EXECUTE ON FUNCTION activate_device TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION authenticate_device TO anon, authenticated, service_role;

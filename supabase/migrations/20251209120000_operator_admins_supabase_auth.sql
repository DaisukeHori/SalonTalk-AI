-- ===========================================
-- SalonTalk AI - Operator Admins Supabase Auth Migration
-- ===========================================
-- Change operator_admins to use Supabase Auth
-- Pattern: id = auth.users(id) (same as staffs table)
-- ===========================================

-- ============================================================
-- 1. Drop old constraints and columns
-- ============================================================

-- Drop audit_logs FK constraint temporarily
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_operator_id_fkey;

-- ============================================================
-- 2. Recreate operator_admins table with auth.users linkage
-- ============================================================

-- Store old data temporarily
CREATE TEMP TABLE old_operator_admins AS SELECT * FROM operator_admins;

-- Drop old table
DROP TABLE IF EXISTS operator_admins CASCADE;

-- Create new table with auth.users linkage
CREATE TABLE operator_admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator_support'
    CHECK (role IN ('operator_admin', 'operator_support')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_operator_admins_email ON operator_admins(email);
CREATE INDEX idx_operator_admins_active ON operator_admins(is_active) WHERE is_active = TRUE;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_operator_admins_updated_at ON operator_admins;
CREATE TRIGGER trigger_operator_admins_updated_at
  BEFORE UPDATE ON operator_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE operator_admins IS 'SalonTalk AI operator accounts - linked to auth.users';
COMMENT ON COLUMN operator_admins.id IS 'Same as auth.users(id)';
COMMENT ON COLUMN operator_admins.role IS 'operator_admin: full access, operator_support: limited access';

-- ============================================================
-- 3. RLS Policies
-- ============================================================

ALTER TABLE operator_admins ENABLE ROW LEVEL SECURITY;

-- Operator can read their own record
CREATE POLICY "operator_admins_self_read" ON operator_admins
  FOR SELECT USING (auth.uid() = id);

-- Service role can do everything
CREATE POLICY "operator_admins_service_all" ON operator_admins
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- 4. Recreate audit_logs FK
-- ============================================================

-- Add FK back
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES operator_admins(id) ON DELETE RESTRICT;

-- ============================================================
-- 5. Helper function to check if user is operator
-- ============================================================

CREATE OR REPLACE FUNCTION is_operator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operator_admins
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_operator_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM operator_admins
    WHERE id = auth.uid() AND is_active = TRUE AND role = 'operator_admin'
  );
END;
$$;

COMMENT ON FUNCTION is_operator IS 'Check if current user is an active operator';
COMMENT ON FUNCTION is_operator_admin IS 'Check if current user is an operator_admin';

-- ============================================================
-- 6. Update audit_logs RLS to use new check
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_service_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_select" ON audit_logs;

-- Operators can insert audit logs
CREATE POLICY "audit_logs_operator_insert" ON audit_logs
  FOR INSERT WITH CHECK (is_operator() AND operator_id = auth.uid());

-- Operator admins can read all audit logs
CREATE POLICY "audit_logs_admin_select" ON audit_logs
  FOR SELECT USING (is_operator_admin());

-- Service role can do everything
CREATE POLICY "audit_logs_service_all" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Done
-- ============================================================

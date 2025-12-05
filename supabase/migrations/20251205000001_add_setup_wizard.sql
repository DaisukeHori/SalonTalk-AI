-- ===========================================
-- SalonTalk AI - Setup Wizard Migration
-- ===========================================
-- Adds setup_completed columns and setup_progress table
-- for initial setup wizard functionality
-- Date: 2025-12-05
-- ===========================================

-- ============================================================
-- 1. Add setup_completed to salons
-- ============================================================

ALTER TABLE salons
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup of salons needing setup
CREATE INDEX IF NOT EXISTS idx_salons_setup_completed
ON salons(setup_completed) WHERE setup_completed = false;

-- ============================================================
-- 2. Add setup_completed to staffs
-- ============================================================

ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup of staff needing setup
CREATE INDEX IF NOT EXISTS idx_staffs_setup_completed
ON staffs(setup_completed) WHERE setup_completed = false;

-- ============================================================
-- 3. Create setup_progress table
-- ============================================================

CREATE TABLE IF NOT EXISTS setup_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('salon', 'staff')),
    current_step INTEGER NOT NULL DEFAULT 1,
    completed_steps INTEGER[] NOT NULL DEFAULT '{}',
    step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT setup_progress_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_setup_progress_user_id
ON setup_progress(user_id);

-- ============================================================
-- 4. Create staff_invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'stylist' CHECK (role IN ('stylist', 'manager')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_salon_id
ON staff_invitations(salon_id);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email
ON staff_invitations(email);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token
ON staff_invitations(token);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_status
ON staff_invitations(status) WHERE status = 'pending';

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE setup_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- setup_progress: Users can only access their own progress
CREATE POLICY "setup_progress_own_access" ON setup_progress
    FOR ALL
    USING (user_id = auth.uid());

-- staff_invitations: Managers/owners can manage invitations for their salon
CREATE POLICY "staff_invitations_salon_access" ON staff_invitations
    FOR ALL
    USING (
        salon_id IN (
            SELECT salon_id FROM staffs
            WHERE id = auth.uid()
            AND role IN ('manager', 'owner', 'admin')
        )
    );

-- staff_invitations: Anyone can read their own invitation by token (for signup flow)
CREATE POLICY "staff_invitations_token_read" ON staff_invitations
    FOR SELECT
    USING (true);

-- ============================================================
-- 6. Updated_at trigger for setup_progress
-- ============================================================

CREATE OR REPLACE FUNCTION update_setup_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_setup_progress_updated_at
    BEFORE UPDATE ON setup_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_setup_progress_updated_at();

-- ============================================================
-- 7. Helper function to check setup status
-- ============================================================

CREATE OR REPLACE FUNCTION get_setup_status(p_user_id UUID)
RETURNS TABLE (
    needs_setup BOOLEAN,
    user_type TEXT,
    current_step INTEGER,
    setup_completed BOOLEAN
) AS $$
DECLARE
    v_staff_record RECORD;
    v_salon_record RECORD;
    v_progress_record RECORD;
BEGIN
    -- Check if user is a staff member
    SELECT s.*, sal.setup_completed as salon_setup_completed
    INTO v_staff_record
    FROM staffs s
    JOIN salons sal ON s.salon_id = sal.id
    WHERE s.id = p_user_id;

    IF FOUND THEN
        -- Get progress if exists
        SELECT * INTO v_progress_record
        FROM setup_progress WHERE user_id = p_user_id;

        -- Determine if user is owner/manager (needs salon setup) or staff (needs personal setup)
        IF v_staff_record.role IN ('owner', 'admin') AND NOT v_staff_record.salon_setup_completed THEN
            RETURN QUERY SELECT
                TRUE,
                'salon'::TEXT,
                COALESCE(v_progress_record.current_step, 1),
                FALSE;
        ELSIF NOT v_staff_record.setup_completed THEN
            RETURN QUERY SELECT
                TRUE,
                'staff'::TEXT,
                COALESCE(v_progress_record.current_step, 1),
                FALSE;
        ELSE
            RETURN QUERY SELECT
                FALSE,
                'staff'::TEXT,
                0,
                TRUE;
        END IF;
    ELSE
        RETURN QUERY SELECT
            FALSE,
            'unknown'::TEXT,
            0,
            FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

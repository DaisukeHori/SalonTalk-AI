-- ===========================================
-- SalonTalk AI - Seed Operator Admin
-- ===========================================
-- Creates initial operator admin account
-- Email: admin@salontalk.jp
-- Password: SalonTalk2025!
-- ===========================================

INSERT INTO operator_admins (email, password_hash, name, role, mfa_enabled)
VALUES ('admin@salontalk.jp', 'FlcshIsiE4ViRoDtA+b3DXXbVU2WYcvCtXNcRmd6NJU=', 'System Admin', 'operator_admin', false)
ON CONFLICT (email) DO NOTHING;

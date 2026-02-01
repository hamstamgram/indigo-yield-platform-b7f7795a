-- Migration: Drop 2FA tables and functions
-- 2FA has been completely removed from the platform

-- Drop 2FA-related tables
DROP TABLE IF EXISTS user_totp_backup_codes CASCADE;
DROP TABLE IF EXISTS user_totp_settings CASCADE;
DROP TABLE IF EXISTS user_access_logs_enhanced CASCADE;
DROP TABLE IF EXISTS system_2fa_policy CASCADE;

-- Drop 2FA-related functions (handle multiple overloads)
DROP FUNCTION IF EXISTS encrypt_totp_secret(TEXT);
DROP FUNCTION IF EXISTS decrypt_totp_secret(BYTEA);
DROP FUNCTION IF EXISTS log_access_event(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS log_access_event(UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS is_2fa_required(UUID);

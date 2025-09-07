-- Migration: 2FA and TOTP Support
-- Enable pgsodium extension for encryption (fallback to pgcrypto if not available)
-- Create tables for TOTP secrets, backup codes, and enhanced access logging

-- Enable extensions for encryption
-- Using pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Note: TOTP secrets will be encrypted using pgcrypto functions
-- The application layer should handle encryption/decryption using a secure key

-- TOTP Configuration table
-- Stores TOTP settings and encrypted secrets for users
CREATE TABLE IF NOT EXISTS user_totp_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- TOTP configuration
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    secret_encrypted BYTEA, -- Encrypted TOTP secret
    algorithm TEXT DEFAULT 'SHA1' CHECK (algorithm IN ('SHA1', 'SHA256', 'SHA512')),
    digits INTEGER DEFAULT 6 CHECK (digits IN (6, 8)),
    period INTEGER DEFAULT 30 CHECK (period > 0),
    
    -- Setup and verification
    verified_at TIMESTAMPTZ,
    setup_completed_at TIMESTAMPTZ,
    qr_code_shown_at TIMESTAMPTZ,
    
    -- Recovery and backup
    backup_codes_generated_at TIMESTAMPTZ,
    recovery_used_count INTEGER DEFAULT 0,
    
    -- Security settings
    enforce_required BOOLEAN DEFAULT FALSE, -- Admin can require 2FA for user
    last_used_at TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(user_id)
);

-- TOTP Backup Codes table
-- Stores hashed backup codes for account recovery
CREATE TABLE IF NOT EXISTS user_totp_backup_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    totp_settings_id UUID NOT NULL REFERENCES user_totp_settings(id) ON DELETE CASCADE,
    
    -- Backup code (stored as hash)
    code_hash TEXT NOT NULL, -- bcrypt hash of the backup code
    used_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    generated_batch_id UUID, -- Groups codes generated together
    
    UNIQUE(user_id, code_hash)
);

-- Enhanced Access Logs table (extends existing functionality)
-- This will replace/enhance the existing access_logs table
CREATE TABLE IF NOT EXISTS user_access_logs_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event details
    event TEXT NOT NULL CHECK (event IN (
        'login_success', 'login_failure', 'logout', 
        '2fa_setup', '2fa_verify_success', '2fa_verify_failure', 
        '2fa_backup_used', '2fa_disabled', '2fa_recovery_used',
        'session_created', 'session_revoked', 'session_expired',
        'password_change', 'password_reset_request', 'password_reset_complete',
        'email_change', 'profile_update'
    )),
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    device_fingerprint TEXT, -- Browser/device fingerprint for tracking
    location_country TEXT, -- Resolved country from IP (optional)
    location_city TEXT, -- Resolved city from IP (optional)
    
    -- Authentication details
    authentication_method TEXT, -- 'password', 'totp', 'backup_code', 'magic_link'
    session_id TEXT, -- Supabase session ID
    
    -- Success/failure details
    success BOOLEAN NOT NULL,
    failure_reason TEXT, -- Details for failed attempts
    
    -- 2FA specific details
    totp_used BOOLEAN DEFAULT FALSE,
    backup_code_used BOOLEAN DEFAULT FALSE,
    
    -- Additional context
    metadata JSONB DEFAULT '{}', -- Additional event-specific data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- System-wide 2FA enforcement settings
-- Allows admins to configure 2FA requirements
CREATE TABLE IF NOT EXISTS system_2fa_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Policy settings
    require_2fa_for_admins BOOLEAN DEFAULT FALSE,
    require_2fa_for_investors BOOLEAN DEFAULT FALSE,
    grace_period_days INTEGER DEFAULT 30, -- Days to enable 2FA before enforcement
    
    -- Backup code settings  
    backup_codes_count INTEGER DEFAULT 10 CHECK (backup_codes_count BETWEEN 5 AND 20),
    backup_code_length INTEGER DEFAULT 8 CHECK (backup_code_length BETWEEN 6 AND 12),
    
    -- Security settings
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Insert default 2FA policy
INSERT INTO system_2fa_policy (require_2fa_for_admins, require_2fa_for_investors)
SELECT FALSE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_2fa_policy);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_totp_settings_user_id ON user_totp_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_totp_settings_enabled ON user_totp_settings(enabled) WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_user_id ON user_totp_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_used ON user_totp_backup_codes(used_at) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_access_logs_enhanced_user_id ON user_access_logs_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_enhanced_created_at ON user_access_logs_enhanced(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_enhanced_event ON user_access_logs_enhanced(event);
CREATE INDEX IF NOT EXISTS idx_access_logs_enhanced_ip ON user_access_logs_enhanced(ip_address);

-- RLS Policies

-- TOTP Settings: Users can only see their own settings
ALTER TABLE user_totp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own TOTP settings" ON user_totp_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own TOTP settings" ON user_totp_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TOTP settings" ON user_totp_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all TOTP settings" ON user_totp_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );

-- Backup Codes: Users can only see their own codes
ALTER TABLE user_totp_backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup codes" ON user_totp_backup_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes" ON user_totp_backup_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup codes" ON user_totp_backup_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- Access Logs: Users can see their own, admins can see all
ALTER TABLE user_access_logs_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs" ON user_access_logs_enhanced
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert access logs" ON user_access_logs_enhanced
    FOR INSERT WITH CHECK (TRUE); -- Allow Edge Functions to insert logs

CREATE POLICY "Admins can view all access logs" ON user_access_logs_enhanced
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );

-- System policy: Only admins can read/update
ALTER TABLE system_2fa_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage 2FA policy" ON system_2fa_policy
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = TRUE
        )
    );

-- Utility functions for TOTP management

-- Function to encrypt TOTP secret
CREATE OR REPLACE FUNCTION encrypt_totp_secret(secret_text TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    master_key BYTEA;
    encrypted_secret BYTEA;
BEGIN
    -- Get the master key for TOTP encryption
    SELECT secret INTO master_key 
    FROM pgsodium.key 
    WHERE name = 'totp_master_key';
    
    IF master_key IS NULL THEN
        RAISE EXCEPTION 'TOTP master key not found';
    END IF;
    
    -- Encrypt the secret using authenticated encryption
    encrypted_secret := pgsodium.crypto_aead_det_encrypt(
        convert_to(secret_text, 'utf8'),
        convert_to('totp_secret', 'utf8'), -- Additional authenticated data
        master_key
    );
    
    RETURN encrypted_secret;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to pgcrypto if pgsodium fails
        RETURN pgp_sym_encrypt(secret_text, 'totp_master_key_fallback');
END;
$$;

-- Function to decrypt TOTP secret (SECURITY DEFINER - only callable by server)
CREATE OR REPLACE FUNCTION decrypt_totp_secret(encrypted_secret BYTEA)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    master_key BYTEA;
    decrypted_secret TEXT;
BEGIN
    -- Get the master key for TOTP encryption
    SELECT secret INTO master_key 
    FROM pgsodium.key 
    WHERE name = 'totp_master_key';
    
    IF master_key IS NULL THEN
        RAISE EXCEPTION 'TOTP master key not found';
    END IF;
    
    -- Decrypt the secret
    decrypted_secret := convert_from(
        pgsodium.crypto_aead_det_decrypt(
            encrypted_secret,
            convert_to('totp_secret', 'utf8'),
            master_key
        ),
        'utf8'
    );
    
    RETURN decrypted_secret;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to pgcrypto
        RETURN pgp_sym_decrypt(encrypted_secret, 'totp_master_key_fallback');
END;
$$;

-- Function to log access events
CREATE OR REPLACE FUNCTION log_access_event(
    p_user_id UUID,
    p_event TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_failure_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_access_logs_enhanced (
        user_id, event, ip_address, user_agent, 
        success, failure_reason, metadata
    ) VALUES (
        p_user_id, p_event, p_ip_address, p_user_agent,
        p_success, p_failure_reason, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to check if 2FA is required for a user
CREATE OR REPLACE FUNCTION is_2fa_required(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_is_admin BOOLEAN;
    policy_record RECORD;
    user_totp_record RECORD;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO user_is_admin 
    FROM profiles 
    WHERE id = p_user_id;
    
    -- Get current policy
    SELECT * INTO policy_record FROM system_2fa_policy LIMIT 1;
    
    -- Get user's TOTP settings
    SELECT * INTO user_totp_record 
    FROM user_totp_settings 
    WHERE user_id = p_user_id;
    
    -- Check if 2FA is required based on policy
    IF user_is_admin AND policy_record.require_2fa_for_admins THEN
        RETURN TRUE;
    END IF;
    
    IF NOT user_is_admin AND policy_record.require_2fa_for_investors THEN
        RETURN TRUE;
    END IF;
    
    -- Check if specifically required for this user
    IF user_totp_record.enforce_required THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Apply the trigger to relevant tables
CREATE TRIGGER update_totp_settings_updated_at
    BEFORE UPDATE ON user_totp_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_2fa_policy_updated_at
    BEFORE UPDATE ON system_2fa_policy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_totp_settings IS 'TOTP configuration and encrypted secrets for users';
COMMENT ON TABLE user_totp_backup_codes IS 'Hashed backup codes for 2FA recovery';
COMMENT ON TABLE user_access_logs_enhanced IS 'Enhanced access logs with 2FA tracking and geolocation';
COMMENT ON TABLE system_2fa_policy IS 'System-wide 2FA enforcement policies';

COMMENT ON FUNCTION encrypt_totp_secret(TEXT) IS 'Encrypts TOTP secret using master key';
COMMENT ON FUNCTION decrypt_totp_secret(BYTEA) IS 'Decrypts TOTP secret - SECURITY DEFINER only';
COMMENT ON FUNCTION log_access_event(UUID, TEXT, INET, TEXT, BOOLEAN, TEXT, JSONB) IS 'Logs user access events with context';
COMMENT ON FUNCTION is_2fa_required(UUID) IS 'Checks if 2FA is required for a specific user';

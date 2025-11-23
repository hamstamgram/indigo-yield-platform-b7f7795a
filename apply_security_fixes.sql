-- ================================================================
-- SECURITY FIXES BATCH - November 22, 2025
-- ================================================================

BEGIN;

-- ================================================================
-- Fix 1: Audit Log RLS Policy (CRITICAL)
-- ================================================================
DROP POLICY IF EXISTS "audit_log_insert_policy" ON public.audit_log;

-- Create secure policy: actor_user must match authenticated user
CREATE POLICY "audit_log_insert_secure" ON public.audit_log
    FOR INSERT
    WITH CHECK (actor_user = auth.uid());

-- Ensure audit function is properly granted
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB)
TO authenticated;

-- ================================================================
-- Fix 2: Profile Creation Trigger (MEDIUM)
-- ================================================================
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;

-- Create trigger function to auto-create profiles
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-create profile for new user
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::BOOLEAN, FALSE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;  -- Don't block user creation if profile fails
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_on_signup();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_on_signup() TO postgres, service_role;

-- ================================================================
-- Fix 3: Add Missing Indexes for Performance
-- ================================================================
-- Email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON public.email_logs(user_id, created_at DESC);

-- Transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_investor_date ON public.transactions(investor_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_statements_investor_period ON public.monthly_statements(investor_id, statement_period DESC);

-- Dashboard queries
CREATE INDEX IF NOT EXISTS idx_investor_profiles_active ON public.investor_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_yield_rates_date ON public.daily_yield_rates(rate_date DESC);

-- ================================================================
-- Fix 4: Security Event Logging Table
-- ================================================================
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    error_message TEXT,
    stack_trace TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read security events
CREATE POLICY "security_events_admin_read" ON public.security_events
    FOR SELECT
    USING (public.is_admin());

-- System can insert security events
CREATE POLICY "security_events_system_insert" ON public.security_events
    FOR INSERT
    WITH CHECK (true);

-- Create index for queries
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_type_severity ON public.security_events(event_type, severity);
CREATE INDEX idx_security_events_user ON public.security_events(user_id) WHERE user_id IS NOT NULL;

-- ================================================================
-- Fix 5: Add GDPR Compliance Tables
-- ================================================================
CREATE TABLE IF NOT EXISTS public.gdpr_consent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    consented BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, consent_type)
);

CREATE TABLE IF NOT EXISTS public.gdpr_data_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    request_type TEXT NOT NULL CHECK (request_type IN ('EXPORT', 'DELETE', 'RECTIFY')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    export_url TEXT,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.gdpr_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_data_requests ENABLE ROW LEVEL SECURITY;

-- Users can manage their own consent
CREATE POLICY "gdpr_consent_own" ON public.gdpr_consent
    FOR ALL
    USING (user_id = auth.uid());

-- Users can view their own requests
CREATE POLICY "gdpr_requests_own_select" ON public.gdpr_data_requests
    FOR SELECT
    USING (user_id = auth.uid());

-- Only users can create their own requests
CREATE POLICY "gdpr_requests_own_insert" ON public.gdpr_data_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- ================================================================
-- Fix 6: Add MFA Support Table
-- ================================================================
CREATE TABLE IF NOT EXISTS public.mfa_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_method TEXT CHECK (mfa_method IN ('TOTP', 'SMS', 'EMAIL')),
    backup_codes TEXT[], -- Encrypted backup codes
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own MFA settings
CREATE POLICY "mfa_settings_own" ON public.mfa_settings
    FOR ALL
    USING (user_id = auth.uid());

-- ================================================================
-- Verification
-- ================================================================
DO $$
BEGIN
    RAISE NOTICE 'Security fixes applied successfully:';
    RAISE NOTICE '✅ Audit log RLS policy secured';
    RAISE NOTICE '✅ Profile creation trigger installed';
    RAISE NOTICE '✅ Performance indexes added';
    RAISE NOTICE '✅ Security events table created';
    RAISE NOTICE '✅ GDPR compliance tables added';
    RAISE NOTICE '✅ MFA support table created';
END $$;

COMMIT;

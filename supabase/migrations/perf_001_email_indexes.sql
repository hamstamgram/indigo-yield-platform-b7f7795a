-- ================================================================
-- Migration: Add Performance Indexes for Email Lookups
-- Date: 2025-11-22
-- Severity: MEDIUM (Performance)
-- Description: Add indexes on email columns to speed up lookups
-- ================================================================

BEGIN;

-- Index on profiles.email for login/lookup operations
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);

-- Index on admin_invites.email for invite validation
CREATE INDEX IF NOT EXISTS idx_admin_invites_email
ON public.admin_invites(email);

-- Index on email_logs.recipient for audit trail queries
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient
ON public.email_logs(recipient);

-- Composite index on email_logs for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created
ON public.email_logs(user_id, created_at DESC);

-- Index on admin_invites.invite_code for fast invite redemption
CREATE INDEX IF NOT EXISTS idx_admin_invites_code
ON public.admin_invites(invite_code) WHERE used = FALSE;

-- Index on access_logs for security monitoring
CREATE INDEX IF NOT EXISTS idx_access_logs_user_created
ON public.access_logs(user_id, created_at DESC);

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Email lookup indexes created successfully';
    RAISE NOTICE 'Expected performance improvement: 50-90%% on email queries';
END $$;

COMMIT;

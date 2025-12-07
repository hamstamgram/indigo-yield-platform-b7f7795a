-- ============================================
-- DEPLOY NEW TABLES MIGRATION
-- Date: 2025-11-18
-- Purpose: Deploy investor_emails, email_logs, onboarding_submissions
-- ============================================

BEGIN;

-- ============================================
-- TABLE 1: investor_emails (Multi-Email Support)
-- ============================================

CREATE TABLE IF NOT EXISTS public.investor_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Email validation
  CONSTRAINT investor_emails_email_check
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),

  -- Prevent duplicate emails per investor
  CONSTRAINT investor_emails_unique_email_per_investor
    UNIQUE(investor_id, email)
);

-- Ensure only one primary email per investor
CREATE UNIQUE INDEX IF NOT EXISTS investor_emails_one_primary_per_investor
  ON public.investor_emails(investor_id)
  WHERE is_primary = true;

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_investor_emails_email
  ON public.investor_emails(email);

-- Index for investor queries
CREATE INDEX IF NOT EXISTS idx_investor_emails_investor_id
  ON public.investor_emails(investor_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_investor_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER investor_emails_updated_at_trigger
  BEFORE UPDATE ON public.investor_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_emails_updated_at();

COMMENT ON TABLE public.investor_emails IS 'Multi-email support for investors (companies can have multiple recipients)';

-- ============================================
-- TABLE 2: email_logs (Email Delivery Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'monthly_report', 'notification', 'support', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_email_logs_status
  ON public.email_logs(status);

-- Index for investor queries
CREATE INDEX IF NOT EXISTS idx_email_logs_investor_id
  ON public.email_logs(investor_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at
  ON public.email_logs(sent_at);

-- Index for email type filtering
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type
  ON public.email_logs(email_type);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_logs_updated_at_trigger
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

COMMENT ON TABLE public.email_logs IS 'Email delivery tracking and audit log';

-- ============================================
-- TABLE 3: onboarding_submissions (Airtable Integration)
-- ============================================

CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airtable_record_id TEXT UNIQUE NOT NULL,
  submission_data JSONB NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'error'

  -- Processing tracking
  processed_at TIMESTAMPTZ,
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for Airtable record lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_airtable_record_id
  ON public.onboarding_submissions(airtable_record_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_onboarding_sync_status
  ON public.onboarding_submissions(sync_status);

-- Index for investor linkage
CREATE INDEX IF NOT EXISTS idx_onboarding_investor_id
  ON public.onboarding_submissions(investor_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_onboarding_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER onboarding_submissions_updated_at_trigger
  BEFORE UPDATE ON public.onboarding_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_submissions_updated_at();

COMMENT ON TABLE public.onboarding_submissions IS 'Airtable onboarding submissions sync tracking';

-- ============================================
-- VERIFICATION: Check new tables created
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'NEW TABLES DEPLOYMENT COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Created: investor_emails';
  RAISE NOTICE 'Created: email_logs';
  RAISE NOTICE 'Created: onboarding_submissions';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Multi-email support: ENABLED';
  RAISE NOTICE 'Email tracking: ENABLED';
  RAISE NOTICE 'Airtable integration: ENABLED';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check table creation
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name = t.table_name AND table_schema = 'public') as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('investor_emails', 'email_logs', 'onboarding_submissions')
ORDER BY table_name;

-- Check indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('investor_emails', 'email_logs', 'onboarding_submissions')
ORDER BY tablename, indexname;

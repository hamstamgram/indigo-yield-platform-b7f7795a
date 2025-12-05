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

DROP TRIGGER IF EXISTS investor_emails_updated_at_trigger ON public.investor_emails;

CREATE TRIGGER investor_emails_updated_at_trigger
  BEFORE UPDATE ON public.investor_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_investor_emails_updated_at();

COMMENT ON TABLE public.investor_emails IS 'Multi-email support for investors (companies can have multiple recipients)';

-- RLS Policies
ALTER TABLE public.investor_emails ENABLE ROW LEVEL SECURITY;

-- Admins can manage all emails
DROP POLICY IF EXISTS "Admins can manage all investor emails" ON public.investor_emails;
CREATE POLICY "Admins can manage all investor emails"
  ON public.investor_emails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Investors can view their own emails
DROP POLICY IF EXISTS "Investors can view own emails" ON public.investor_emails;
CREATE POLICY "Investors can view own emails"
  ON public.investor_emails
  FOR SELECT
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );

-- Investors can manage their own emails (insert/update/delete)
DROP POLICY IF EXISTS "Investors can manage own emails" ON public.investor_emails;
CREATE POLICY "Investors can manage own emails"
  ON public.investor_emails
  FOR ALL
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );


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

DROP TRIGGER IF EXISTS email_logs_updated_at_trigger ON public.email_logs;

CREATE TRIGGER email_logs_updated_at_trigger
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

COMMENT ON TABLE public.email_logs IS 'Email delivery tracking and audit log';

-- RLS Policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_logs;
CREATE POLICY "Admins can view all email logs"
  ON public.email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can insert logs (system generated)
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;
CREATE POLICY "Admins can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Investors can view their own logs
DROP POLICY IF EXISTS "Investors can view own email logs" ON public.email_logs;
CREATE POLICY "Investors can view own email logs"
  ON public.email_logs
  FOR SELECT
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );


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

DROP TRIGGER IF EXISTS onboarding_submissions_updated_at_trigger ON public.onboarding_submissions;

CREATE TRIGGER onboarding_submissions_updated_at_trigger
  BEFORE UPDATE ON public.onboarding_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_submissions_updated_at();

COMMENT ON TABLE public.onboarding_submissions IS 'Airtable onboarding submissions sync tracking';

-- RLS Policies
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all submissions
DROP POLICY IF EXISTS "Admins can manage all onboarding submissions" ON public.onboarding_submissions;
CREATE POLICY "Admins can manage all onboarding submissions"
  ON public.onboarding_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================
-- VERIFICATION: Check new tables created
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'NEW TABLES DEPLOYMENT COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Created: investor_emails (with RLS)';
  RAISE NOTICE 'Created: email_logs (with RLS)';
  RAISE NOTICE 'Created: onboarding_submissions (with RLS)';
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
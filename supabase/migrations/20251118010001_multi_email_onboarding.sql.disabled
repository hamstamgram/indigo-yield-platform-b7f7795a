-- Multi-Email Support and Onboarding System Migration
-- Created: 2025-11-18
-- Purpose: Support multiple email addresses per investor and track Airtable onboarding submissions

-- =====================================================
-- PART 1: INVESTOR EMAILS TABLE (Many-to-Many)
-- =====================================================

-- Create investor_emails table for multiple emails per investor
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

  -- Prevent duplicate emails for same investor
  CONSTRAINT investor_emails_unique_email_per_investor
    UNIQUE(investor_id, email)
);

-- Ensure only one primary email per investor (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS investor_emails_one_primary_per_investor
  ON public.investor_emails(investor_id)
  WHERE is_primary = true;

-- Performance index for email lookups
CREATE INDEX investor_emails_email_idx ON public.investor_emails(email);
CREATE INDEX investor_emails_investor_id_idx ON public.investor_emails(investor_id);

-- Updated_at trigger
CREATE TRIGGER investor_emails_updated_at
  BEFORE UPDATE ON public.investor_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 2: ONBOARDING SUBMISSIONS TABLE
-- =====================================================

-- Create onboarding_submissions table for Airtable integration
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submission data from Airtable/Jotform
  full_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  additional_emails TEXT[], -- Array of additional emails

  -- Integration tracking
  airtable_record_id TEXT UNIQUE, -- Airtable record ID for sync
  jotform_submission_id TEXT,     -- Original Jotform submission ID

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'duplicate')),

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Processing metadata
  processed_by UUID REFERENCES public.profiles(id), -- Admin who processed
  created_investor_id UUID REFERENCES public.investors(id), -- Created investor

  -- Raw data from Airtable (for debugging/audit)
  raw_data JSONB,

  -- Notes from admin
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS airtable_record_id TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS created_investor_id UUID REFERENCES public.investors(id);

ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS additional_emails TEXT[];
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS airtable_record_id TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS jotform_submission_id TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS created_investor_id UUID REFERENCES public.investors(id);
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.onboarding_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for common queries
CREATE INDEX onboarding_submissions_status_idx ON public.onboarding_submissions(status);
CREATE INDEX onboarding_submissions_email_idx ON public.onboarding_submissions(email);
CREATE INDEX onboarding_submissions_submitted_at_idx ON public.onboarding_submissions(submitted_at DESC);
CREATE INDEX onboarding_submissions_airtable_record_idx ON public.onboarding_submissions(airtable_record_id);
CREATE INDEX onboarding_submissions_created_investor_idx ON public.onboarding_submissions(created_investor_id);

-- Updated_at trigger
CREATE TRIGGER onboarding_submissions_updated_at
  BEFORE UPDATE ON public.onboarding_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PART 3: HELPER FUNCTIONS
-- =====================================================

-- Function: Get all emails for an investor
CREATE OR REPLACE FUNCTION public.get_investor_emails(investor_uuid UUID)
RETURNS TABLE (
  email TEXT,
  is_primary BOOLEAN,
  verified BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.email,
    ie.is_primary,
    ie.verified,
    ie.created_at
  FROM public.investor_emails ie
  WHERE ie.investor_id = investor_uuid
  ORDER BY ie.is_primary DESC, ie.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Add email to investor
CREATE OR REPLACE FUNCTION public.add_investor_email(
  investor_uuid UUID,
  new_email TEXT,
  set_as_primary BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  new_email_id UUID;
BEGIN
  -- If setting as primary, unset existing primary
  IF set_as_primary THEN
    UPDATE public.investor_emails
    SET is_primary = false
    WHERE investor_id = investor_uuid AND is_primary = true;
  END IF;

  -- Insert new email
  INSERT INTO public.investor_emails (investor_id, email, is_primary)
  VALUES (investor_uuid, new_email, set_as_primary)
  ON CONFLICT (investor_id, email) DO UPDATE
    SET is_primary = EXCLUDED.is_primary
  RETURNING id INTO new_email_id;

  RETURN new_email_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get primary email for investor
CREATE OR REPLACE FUNCTION public.get_primary_email(investor_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  primary_email TEXT;
BEGIN
  SELECT email INTO primary_email
  FROM public.investor_emails
  WHERE investor_id = investor_uuid AND is_primary = true
  LIMIT 1;

  -- Fallback to legacy investors.email if no primary found
  IF primary_email IS NULL THEN
    SELECT email INTO primary_email
    FROM public.investors
    WHERE id = investor_uuid;
  END IF;

  RETURN primary_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Remove email from investor
CREATE OR REPLACE FUNCTION public.remove_investor_email(
  investor_uuid UUID,
  email_to_remove TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  was_primary BOOLEAN;
  email_count INTEGER;
BEGIN
  -- Check if this is the primary email
  SELECT is_primary INTO was_primary
  FROM public.investor_emails
  WHERE investor_id = investor_uuid AND email = email_to_remove;

  -- Count total emails for this investor
  SELECT COUNT(*) INTO email_count
  FROM public.investor_emails
  WHERE investor_id = investor_uuid;

  -- Prevent removing the only email
  IF email_count <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the only email for investor';
  END IF;

  -- Delete the email
  DELETE FROM public.investor_emails
  WHERE investor_id = investor_uuid AND email = email_to_remove;

  -- If we removed the primary, set the oldest remaining email as primary
  IF was_primary THEN
    UPDATE public.investor_emails
    SET is_primary = true
    WHERE id = (
      SELECT id FROM public.investor_emails
      WHERE investor_id = investor_uuid
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 4: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on investor_emails
ALTER TABLE public.investor_emails ENABLE ROW LEVEL SECURITY;

-- Admin can view all investor emails
DROP POLICY IF EXISTS "Admins can view all investor emails" ON public.investor_emails;
CREATE POLICY "Admins can view all investor emails"
  ON public.investor_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Investors can view their own emails
DROP POLICY IF EXISTS "Investors can view their own emails" ON public.investor_emails;
CREATE POLICY "Investors can view their own emails"
  ON public.investor_emails
  FOR SELECT
  TO authenticated
  USING (
    investor_id IN (
      SELECT id FROM public.investors
      WHERE profile_id = auth.uid()
    )
  );

-- Admin can insert investor emails
CREATE POLICY "Admins can insert investor emails"
  ON public.investor_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Admin can update investor emails
CREATE POLICY "Admins can update investor emails"
  ON public.investor_emails
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Admin can delete investor emails
CREATE POLICY "Admins can delete investor emails"
  ON public.investor_emails
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Enable RLS on onboarding_submissions
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Admin can view all onboarding submissions
CREATE POLICY "Admins can view all onboarding submissions"
  ON public.onboarding_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Admin can insert onboarding submissions
CREATE POLICY "Admins can insert onboarding submissions"
  ON public.onboarding_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- Admin can update onboarding submissions
CREATE POLICY "Admins can update onboarding submissions"
  ON public.onboarding_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND COALESCE(profiles.is_admin, false) = true
    )
  );

-- =====================================================
-- PART 5: DATA MIGRATION (Existing Investors)
-- =====================================================

-- Migrate existing investor emails to investor_emails table
DO $$
DECLARE
  investor_record RECORD;
BEGIN
  -- Loop through all existing investors with email
  FOR investor_record IN
    SELECT id, email
    FROM public.investors
    WHERE email IS NOT NULL AND email != ''
  LOOP
    -- Insert as primary email if not already exists
    INSERT INTO public.investor_emails (investor_id, email, is_primary, verified)
    VALUES (investor_record.id, investor_record.email, true, true)
    ON CONFLICT (investor_id, email) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Migrated existing investor emails to investor_emails table';
END $$;

-- =====================================================
-- PART 6: BACKWARD COMPATIBILITY
-- =====================================================

-- Remove UNIQUE constraint from investors.email (if exists)
-- This allows multiple investors to share the same email during transition
DO $$
BEGIN
  ALTER TABLE public.investors DROP CONSTRAINT IF EXISTS investors_email_key;
EXCEPTION
  WHEN undefined_object THEN
    -- Constraint doesn't exist, nothing to do
    NULL;
END $$;

-- =====================================================
-- PART 7: COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.investor_emails IS 'Stores multiple email addresses per investor with primary designation';
COMMENT ON TABLE public.onboarding_submissions IS 'Tracks investor onboarding submissions from Jotform via Airtable';

COMMENT ON COLUMN public.investor_emails.is_primary IS 'Only one email can be primary per investor (enforced by unique index)';
COMMENT ON COLUMN public.investor_emails.verified IS 'Whether the email has been verified (e.g., via confirmation link)';

COMMENT ON COLUMN public.onboarding_submissions.status IS 'Workflow: pending → processing → approved/rejected/duplicate';
COMMENT ON COLUMN public.onboarding_submissions.airtable_record_id IS 'Unique Airtable record ID for sync and deduplication';
COMMENT ON COLUMN public.onboarding_submissions.raw_data IS 'Full JSON data from Airtable for debugging/audit purposes';
COMMENT ON COLUMN public.onboarding_submissions.created_investor_id IS 'Links to created investor (null if not yet processed)';

COMMENT ON FUNCTION public.get_investor_emails(UUID) IS 'Returns all emails for an investor, ordered by primary first';
COMMENT ON FUNCTION public.add_investor_email(UUID, TEXT, BOOLEAN) IS 'Adds email to investor, optionally setting as primary';
COMMENT ON FUNCTION public.get_primary_email(UUID) IS 'Gets primary email for investor with fallback to legacy column';
COMMENT ON FUNCTION public.remove_investor_email(UUID, TEXT) IS 'Removes email from investor (prevents removing only email)';

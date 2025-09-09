-- Migration: Create Statements Storage Bucket with RLS Policies
-- Created: 2025-01-09
-- Purpose: Setup secure storage for PDF statements with signed URL access

-- Create statements bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'statements',
  'statements',
  false, -- Private bucket
  10485760, -- 10MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- ============================================
-- STORAGE POLICIES FOR STATEMENTS BUCKET
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "statements_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_select_own" ON storage.objects;
DROP POLICY IF EXISTS "statements_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_delete_admin" ON storage.objects;

-- Only admin can insert statements
CREATE POLICY "statements_insert_admin" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'statements' 
  AND public.is_admin_for_jwt()
);

-- LP can only read their own statements (path starts with their user ID)
CREATE POLICY "statements_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'statements' 
  AND (
    -- Path format: statements/{user_id}/{year}/{filename}
    name LIKE auth.uid()::text || '/%'
  )
);

-- Admin can read all statements
CREATE POLICY "statements_select_admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'statements' 
  AND public.is_admin_for_jwt()
);

-- Only admin can update statements
CREATE POLICY "statements_update_admin" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'statements' 
  AND public.is_admin_for_jwt()
)
WITH CHECK (
  bucket_id = 'statements' 
  AND public.is_admin_for_jwt()
);

-- Only admin can delete statements
CREATE POLICY "statements_delete_admin" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'statements' 
  AND public.is_admin_for_jwt()
);

-- ============================================
-- EDGE FUNCTION FOR STATEMENT GENERATION
-- ============================================

-- Create a function to generate signed URLs for statements
CREATE OR REPLACE FUNCTION public.get_statement_signed_url(
  p_storage_path TEXT,
  p_expires_in INT DEFAULT 300 -- 5 minutes default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signed_url TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  v_is_admin := public.is_admin_for_jwt();
  
  -- Check authorization
  IF NOT v_is_admin THEN
    -- For non-admin, check if the path belongs to them
    IF NOT (p_storage_path LIKE '%/' || v_user_id::text || '/%') THEN
      RAISE EXCEPTION 'Unauthorized access to statement';
    END IF;
  END IF;
  
  -- Generate signed URL using Supabase internal function
  -- Note: This is a placeholder - actual implementation would use Supabase's internal signing
  -- In production, this should be handled by an Edge Function with service role key
  
  -- For now, return the path with a note that it needs Edge Function
  RETURN 'SIGNED_URL_GENERATION_REQUIRES_EDGE_FUNCTION:' || p_storage_path;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_statement_signed_url(TEXT, INT) TO authenticated;

-- ============================================
-- STATEMENT METADATA TABLE
-- ============================================

-- Create statements metadata table if not exists
CREATE TABLE IF NOT EXISTS public.statement_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,
  email_sent_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period_year, period_month)
);

-- Enable RLS on statement_metadata
ALTER TABLE statement_metadata ENABLE ROW LEVEL SECURITY;

-- LP can only read their own statement metadata
CREATE POLICY "statement_metadata_select_own" ON statement_metadata
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin can read all statement metadata
CREATE POLICY "statement_metadata_select_admin" ON statement_metadata
  FOR SELECT
  USING (public.is_admin_for_jwt());

-- Only admin can insert statement metadata
CREATE POLICY "statement_metadata_insert_admin" ON statement_metadata
  FOR INSERT
  WITH CHECK (public.is_admin_for_jwt());

-- Only admin can update statement metadata
CREATE POLICY "statement_metadata_update_admin" ON statement_metadata
  FOR UPDATE
  USING (public.is_admin_for_jwt());

-- Only admin can delete statement metadata
CREATE POLICY "statement_metadata_delete_admin" ON statement_metadata
  FOR DELETE
  USING (public.is_admin_for_jwt());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_statement_metadata_user_id ON statement_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_statement_metadata_period ON statement_metadata(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_statement_metadata_generated_at ON statement_metadata(generated_at);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE statement_metadata IS 'Tracks all generated statements with storage paths and metadata';
COMMENT ON COLUMN statement_metadata.storage_path IS 'Path in storage bucket: statements/{user_id}/{year}/{filename}';
COMMENT ON COLUMN statement_metadata.email_sent_to IS 'Email address where statement was sent (no PII in email body)';
COMMENT ON FUNCTION public.get_statement_signed_url IS 'Generates signed URLs for statement access - requires Edge Function in production';

-- ============================================
-- VALIDATION
-- ============================================

-- Verify bucket exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'statements') THEN
    RAISE WARNING 'Statements bucket was not created successfully';
  ELSE
    RAISE NOTICE 'Statements bucket configured successfully';
  END IF;
END $$;

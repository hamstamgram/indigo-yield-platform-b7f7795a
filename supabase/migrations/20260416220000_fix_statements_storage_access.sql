-- ============================================================
-- Fix STATEMENTS STORAGE ACCESS (P1 — Lovable Security Scanner)
--
-- PROBLEM: Investors cannot access their own PDF files in the
-- `statements` bucket. Only admin policies exist.
--
-- FIX: Add SELECT policy for investors on storage.objects for
-- the `statements` bucket, scoped to their own investor ID.
--
-- The path convention for statements is:
--   statements/{investor_id}/{filename}.pdf
--
-- So we match path segment [1] against the user's profile ID.
-- ============================================================

-- Allow authenticated users to read their own statement files
-- Path format: statements/{investor_id}/filename.pdf
CREATE POLICY statements_investor_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'statements'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to list (SELECT) their own folder
-- This is needed for UI directory listing
-- (Supabase storage uses SELECT for both read and list)
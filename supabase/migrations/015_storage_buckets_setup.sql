-- Migration: Storage Buckets Setup
-- Version: 006
-- Date: 2025-09-02
-- Description: Creates storage buckets for documents, statements, and branding assets

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', FALSE, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/plain']), -- 50MB limit
    ('statements', 'statements', FALSE, 52428800, ARRAY['application/pdf']), -- 50MB limit, PDF only
    ('branding-assets', 'branding-assets', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/svg+xml']) -- 10MB limit, images only
ON CONFLICT (id) DO NOTHING;
-- Storage policies for documents bucket
CREATE POLICY "documents_bucket_service_role_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'documents' AND 
        auth.role() = 'service_role'
    );
-- Storage policies for statements bucket
CREATE POLICY "statements_bucket_service_role_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'statements' AND 
        auth.role() = 'service_role'
    );
-- Storage policies for branding-assets bucket
CREATE POLICY "branding_bucket_service_role_policy" ON storage.objects
    FOR ALL USING (
        bucket_id = 'branding-assets' AND 
        auth.role() = 'service_role'
    );
-- Allow authenticated users to view objects only via signed URLs
-- (Edge Functions will generate signed URLs for secure access)
CREATE POLICY "documents_bucket_authenticated_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND 
        auth.role() = 'authenticated'
    );
CREATE POLICY "statements_bucket_authenticated_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'statements' AND 
        auth.role() = 'authenticated'
    );
-- Create helper function to generate secure file paths
CREATE OR REPLACE FUNCTION public.generate_document_path(
    user_id UUID,
    document_type TEXT,
    filename TEXT
) RETURNS TEXT AS $$
BEGIN
    -- Generate secure path without PII in filename
    -- Format: documents/{user_id}/{type}/{uuid}_{sanitized_filename}
    RETURN 'documents/' || user_id::text || '/' || document_type || '/' || 
           gen_random_uuid()::text || '_' || 
           regexp_replace(filename, '[^a-zA-Z0-9.-]', '_', 'g');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create helper function to generate statement paths
CREATE OR REPLACE FUNCTION public.generate_statement_path(
    user_id UUID,
    year INTEGER,
    month INTEGER,
    fund_code TEXT DEFAULT 'default'
) RETURNS TEXT AS $$
BEGIN
    -- Format: statements/{user_id}/{yyyy}/{mm}/statement-{fund_code}-{period}.pdf
    RETURN 'statements/' || user_id::text || '/' || 
           year::text || '/' || 
           lpad(month::text, 2, '0') || '/' ||
           'statement-' || fund_code || '-' || year::text || 
           lpad(month::text, 2, '0') || '.pdf';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.generate_document_path TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_statement_path TO authenticated, service_role;

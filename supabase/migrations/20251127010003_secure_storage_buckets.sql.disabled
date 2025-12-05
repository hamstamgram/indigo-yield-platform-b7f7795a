-- Migration: Secure Storage Buckets RLS
-- Date: 2025-11-27
-- Description: Fixes overly permissive storage policies by enforcing path-based ownership checks.
--              Prevents users from accessing other users' documents and statements.

BEGIN;

-- 1. Drop insecure policies
DROP POLICY IF EXISTS "documents_bucket_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "statements_bucket_authenticated_select" ON storage.objects;

-- 2. Create SECURE policy for 'documents' bucket
-- Allow users to read only their own documents (path starts with their user_id)
-- Allow admins to read all documents
DROP POLICY IF EXISTS "documents_bucket_secure_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_secure_select" ON storage.objects;
CREATE POLICY "documents_bucket_secure_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
        AND (
            -- Path format: documents/{user_id}/...
            -- Check if the first folder segment matches user ID
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Admin override
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            )
        )
    );

-- 3. Create SECURE policy for 'statements' bucket
-- Allow users to read only their own statements (path starts with their user_id)
-- Allow admins to read all statements
DROP POLICY IF EXISTS "statements_bucket_secure_select" ON storage.objects;
DROP POLICY IF EXISTS "statements_bucket_secure_select" ON storage.objects;
CREATE POLICY "statements_bucket_secure_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'statements' 
        AND auth.role() = 'authenticated'
        AND (
            -- Path format: statements/{user_id}/...
            -- Check if the first folder segment matches user ID
            (storage.foldername(name))[1] = auth.uid()::text
            OR
            -- Admin override
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND is_admin = true
            )
        )
    );

-- 4. Add Upload Policy for Admins (if missing)
-- Admins need to be able to upload statements for any user
DROP POLICY IF EXISTS "statements_bucket_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "statements_bucket_admin_insert" ON storage.objects;
CREATE POLICY "statements_bucket_admin_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'statements' 
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "documents_bucket_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_bucket_admin_insert" ON storage.objects;
CREATE POLICY "documents_bucket_admin_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' 
        AND auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- 5. Add Update/Delete Policy for Admins
-- Admins might need to correct or remove files
DROP POLICY IF EXISTS "statements_bucket_admin_modify" ON storage.objects;
DROP POLICY IF EXISTS "statements_bucket_admin_modify" ON storage.objects;
CREATE POLICY "statements_bucket_admin_modify" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'statements' 
        AND auth.role() = 'authenticated'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "statements_bucket_admin_delete" ON storage.objects;
CREATE POLICY "statements_bucket_admin_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'statements' 
        AND auth.role() = 'authenticated'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

COMMIT;

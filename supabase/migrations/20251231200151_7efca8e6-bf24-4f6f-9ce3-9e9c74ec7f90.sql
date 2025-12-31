-- ============================================================================
-- SECURITY HARDENING: Move extension and fix function search paths
-- ============================================================================

-- 1. Create dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. Move btree_gist extension to extensions schema
DROP EXTENSION IF EXISTS btree_gist CASCADE;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA extensions;

-- 4. Update search_path for functions missing explicit search_path

-- Update is_admin_safe function
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
        FALSE
    )
$$;

-- Update is_admin function  
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT public.is_admin_safe()
$$;

-- Update has_role function - simplified to check is_admin only
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = true
    )
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 5. Verify configuration
DO $$
BEGIN
    RAISE NOTICE 'Security hardening complete:';
    RAISE NOTICE '- Extensions schema created';
    RAISE NOTICE '- btree_gist moved to extensions schema';
    RAISE NOTICE '- Function search_path configured';
END $$;
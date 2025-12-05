-- Migration: Link profiles to investors and seed Hammadou Monoja
-- Date: 2025-09-09
-- Description: Normalizes profile-investor relationship, ensures all non-admin profiles have investor records,
--              and specifically links hammadoU@indigo.fund to Hammadou Monoja investor

-- ========================================
-- 1. Normalize profiles table
-- ========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.00;
-- Ensure id is PK and references auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='profiles' AND constraint_type='PRIMARY KEY'
  ) THEN
    ALTER TABLE public.profiles ADD PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END$$;
DO $$
BEGIN
  -- Add FK only if none exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema='public'
      AND tc.table_name='profiles'
      AND tc.constraint_type='FOREIGN KEY'
      AND kcu.column_name='id'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END$$;
-- ========================================
-- 2. Create/normalize investors table
-- ========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='investors'
  ) THEN
    CREATE TABLE public.investors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      tax_id TEXT,
      entity_type TEXT CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation')),
      kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'expired')),
      kyc_date DATE,
      aml_status TEXT DEFAULT 'pending' CHECK (aml_status IN ('pending', 'approved', 'flagged', 'blocked')),
      accredited BOOLEAN DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','closed')),
      onboarding_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END$$;
-- Ensure required columns exist
ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Ensure FK to profiles and 1:1 uniqueness
DO $$
BEGIN
  -- Drop stale FK if it exists with different name; ignore errors
  BEGIN
    ALTER TABLE public.investors DROP CONSTRAINT IF EXISTS investors_profile_id_fkey;
  EXCEPTION WHEN others THEN NULL;
  END;

  ALTER TABLE public.investors
    ADD CONSTRAINT investors_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

EXCEPTION WHEN others THEN NULL;
END$$;
-- Unique 1:1 on profile_id
DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS investors_profile_id_key ON public.investors(profile_id);
EXCEPTION WHEN others THEN NULL;
END$$;
-- ========================================
-- 3. Enable and secure RLS on investors
-- ========================================
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
-- Helper: centralized admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE)
$$;
-- Drop old policies if they exist to avoid duplicates
DROP POLICY IF EXISTS investors_select_self_or_admin ON public.investors;
DROP POLICY IF EXISTS investors_insert_admin_only ON public.investors;
DROP POLICY IF EXISTS investors_update_admin_only ON public.investors;
DROP POLICY IF EXISTS investors_delete_admin_only ON public.investors;
-- Read: owner or admin
CREATE POLICY investors_select_self_or_admin
ON public.investors
FOR SELECT
USING (profile_id = auth.uid() OR public.is_admin());
-- Writes: admin only
CREATE POLICY investors_insert_admin_only
ON public.investors
FOR INSERT
WITH CHECK (public.is_admin());
CREATE POLICY investors_update_admin_only
ON public.investors
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());
CREATE POLICY investors_delete_admin_only
ON public.investors
FOR DELETE
USING (public.is_admin());
-- ========================================
-- 4. Create sync trigger for profiles -> investors
-- ========================================
CREATE OR REPLACE FUNCTION public.ensure_investor_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin = FALSE THEN
    INSERT INTO public.investors(profile_id, name, email)
    VALUES (
      NEW.id, 
      NULLIF(TRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)), ''),
      NEW.email
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET 
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
-- Attach to inserts and is_admin changes
DROP TRIGGER IF EXISTS trg_profiles_after_insert_investor ON public.profiles;
CREATE TRIGGER trg_profiles_after_insert_investor
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_investor_for_profile();
DROP TRIGGER IF EXISTS trg_profiles_after_update_investor ON public.profiles;
CREATE TRIGGER trg_profiles_after_update_investor
AFTER UPDATE OF is_admin, first_name, last_name, email ON public.profiles
FOR EACH ROW
WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin 
   OR OLD.first_name IS DISTINCT FROM NEW.first_name 
   OR OLD.last_name IS DISTINCT FROM NEW.last_name
   OR OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.ensure_investor_for_profile();
-- ========================================
-- 5. Backfill missing investor rows
-- ========================================
INSERT INTO public.investors (profile_id, name, email)
SELECT 
  p.id, 
  NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
  p.email
FROM public.profiles p
WHERE p.is_admin = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.investors i WHERE i.profile_id = p.id
  );
-- ========================================
-- 6. Upsert Hammadou Monoja specifically
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'hammadoU@indigo.fund'; -- case-insensitive match
BEGIN
  -- Find the auth user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email::text ILIKE v_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Upsert profile (ensure non-admin)
    INSERT INTO public.profiles (id, email, first_name, last_name, is_admin, fee_percentage)
    VALUES (v_user_id, LOWER(v_email), 'Hammadou', 'Monoja', FALSE, 2.00)
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          is_admin = FALSE,
          fee_percentage = COALESCE(public.profiles.fee_percentage, 2.00),
          updated_at = NOW();

    -- Ensure investor linked with desired display name
    INSERT INTO public.investors (profile_id, name, email, status, kyc_status)
    VALUES (v_user_id, 'Hammadou Monoja', LOWER(v_email), 'active', 'approved')
    ON CONFLICT (profile_id) DO UPDATE
      SET name = EXCLUDED.name,
          email = EXCLUDED.email,
          status = 'active',
          kyc_status = 'approved',
          updated_at = NOW();
    
    RAISE NOTICE 'Hammadou Monoja profile and investor record created/updated successfully';
  ELSE
    RAISE NOTICE 'User hammadoU@indigo.fund not found in auth.users - skipping';
  END IF;
END$$;
-- ========================================
-- 7. Create/replace RPC functions for app
-- ========================================

-- Function: get_profile_by_id
CREATE OR REPLACE FUNCTION public.get_profile_by_id(profile_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  is_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  fee_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow caller to fetch their own profile, or any profile if caller is admin
  SELECT p.id, p.email, p.first_name, p.last_name, p.is_admin, p.created_at, p.fee_percentage
  FROM public.profiles p
  WHERE p.id = profile_id
    AND (profile_id = auth.uid() OR public.is_admin())
$$;
-- Restrict who can execute
REVOKE ALL ON FUNCTION public.get_profile_by_id(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_by_id(UUID) TO authenticated, service_role;
-- Function: get_all_non_admin_profiles
CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ,
  fee_percentage NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return rows only if caller is admin
  SELECT p.id, p.email, p.first_name, p.last_name, p.created_at, p.fee_percentage
  FROM public.profiles p
  WHERE p.is_admin = FALSE
    AND public.is_admin()
  ORDER BY p.created_at DESC
$$;
-- Restrict who can execute
REVOKE ALL ON FUNCTION public.get_all_non_admin_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.get_all_non_admin_profiles() TO authenticated, service_role;
-- ========================================
-- 8. Create convenience view (optional)
-- ========================================
CREATE OR REPLACE VIEW public.investor_directory AS
SELECT
  p.id AS profile_id,
  p.email,
  p.first_name,
  p.last_name,
  p.created_at,
  p.fee_percentage,
  i.id AS investor_id,
  i.name AS investor_name,
  i.status AS investor_status,
  i.kyc_status,
  i.aml_status
FROM public.profiles p
LEFT JOIN public.investors i ON i.profile_id = p.id
WHERE p.is_admin = FALSE;
-- Grant permissions on the view
GRANT SELECT ON public.investor_directory TO authenticated;
-- ========================================
-- 9. Create get_all_investors_with_summary function for admin page
-- ========================================
CREATE OR REPLACE FUNCTION public.get_all_investors_with_summary()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  total_aum NUMERIC,
  last_statement_date DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return investors with their summary data (admin only)
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(SUM(pos.current_balance), 0) as total_aum,
    MAX(s.period_year::text || '-' || LPAD(s.period_month::text, 2, '0') || '-01')::date as last_statement_date
  FROM public.profiles p
  LEFT JOIN public.positions pos ON pos.investor_id = p.id
  LEFT JOIN public.statements s ON s.investor_id = p.id
  WHERE p.is_admin = FALSE
    AND public.is_admin()  -- Only admins can call this
  GROUP BY p.id, p.email, p.first_name, p.last_name
  ORDER BY p.created_at DESC
$$;
-- Grant execute permission
REVOKE ALL ON FUNCTION public.get_all_investors_with_summary() FROM public;
GRANT EXECUTE ON FUNCTION public.get_all_investors_with_summary() TO authenticated, service_role;
-- ========================================
-- 10. Final verification output
-- ========================================
DO $$
DECLARE
  v_investor_count INTEGER;
  v_profile_count INTEGER;
  v_hammadou_exists BOOLEAN;
BEGIN
  -- Count non-admin profiles
  SELECT COUNT(*) INTO v_profile_count
  FROM public.profiles
  WHERE is_admin = FALSE;
  
  -- Count investors
  SELECT COUNT(*) INTO v_investor_count
  FROM public.investors;
  
  -- Check if Hammadou exists
  SELECT EXISTS(
    SELECT 1 
    FROM public.profiles p
    JOIN public.investors i ON i.profile_id = p.id
    WHERE LOWER(p.email) = 'hammadou@indigo.fund'
  ) INTO v_hammadou_exists;
  
  RAISE NOTICE 'Migration completed: % non-admin profiles, % investors', v_profile_count, v_investor_count;
  RAISE NOTICE 'Hammadou Monoja investor record exists: %', v_hammadou_exists;
END$$;

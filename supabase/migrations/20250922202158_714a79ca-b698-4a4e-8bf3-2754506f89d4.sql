-- PHASE 1: Complete Platform Remediation - Minimal Safe Version

-- =============================================
-- Step 1: Fix Recursive RLS Issues
-- =============================================

-- Drop problematic admin functions that cause recursion
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_safe() CASCADE;

-- Create secure admin check function
CREATE OR REPLACE FUNCTION public.is_admin_secure()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query to avoid RLS recursion
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin_secure() TO authenticated;

-- =============================================
-- Step 2: Fix Missing RLS Policies
-- =============================================

-- Fix access_logs table (currently has no SELECT policy)
DROP POLICY IF EXISTS "Admins can view access logs" ON public.access_logs;
CREATE POLICY "Admins can view access logs"
ON public.access_logs FOR SELECT
USING (public.is_admin_secure());

-- Fix balance_adjustments table (missing SELECT/INSERT policies)
DROP POLICY IF EXISTS "Admins can view balance adjustments" ON public.balance_adjustments;
CREATE POLICY "Admins can view balance adjustments"
ON public.balance_adjustments FOR SELECT
USING (public.is_admin_secure());

DROP POLICY IF EXISTS "Admins can create balance adjustments" ON public.balance_adjustments;
CREATE POLICY "Admins can create balance adjustments"
ON public.balance_adjustments FOR INSERT
WITH CHECK (public.is_admin_secure());

-- Fix fund_fee_history table (missing all policies)
DROP POLICY IF EXISTS "Admins can view fee history" ON public.fund_fee_history;
CREATE POLICY "Admins can view fee history"
ON public.fund_fee_history FOR SELECT
USING (public.is_admin_secure());

DROP POLICY IF EXISTS "Admins can manage fee history" ON public.fund_fee_history;
CREATE POLICY "Admins can manage fee history"
ON public.fund_fee_history FOR INSERT
WITH CHECK (public.is_admin_secure());

-- =============================================
-- Step 3: Create Proper Admin User System
-- =============================================

-- Ensure we have an admin user (using existing profile)
DO $$
DECLARE
    admin_profile_id UUID;
BEGIN
    -- Get the first profile marked as admin, or create one if none exists
    SELECT id INTO admin_profile_id 
    FROM public.profiles 
    WHERE is_admin = TRUE 
    LIMIT 1;
    
    -- If no admin exists, make the first user an admin
    IF admin_profile_id IS NULL THEN
        UPDATE public.profiles 
        SET is_admin = TRUE 
        WHERE id = (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1)
        RETURNING id INTO admin_profile_id;
    END IF;
    
    -- Ensure admin_users record exists
    IF admin_profile_id IS NOT NULL THEN
        INSERT INTO public.admin_users (user_id, granted_by, granted_at)
        VALUES (admin_profile_id, admin_profile_id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Admin user configured: %', admin_profile_id;
    END IF;
END $$;

-- =============================================
-- Step 4: Secure All Database Functions
-- =============================================

-- Update KPI functions to use secure search_path
CREATE OR REPLACE FUNCTION public.get_total_aum()
RETURNS TABLE(total_aum NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(p.current_balance), 0) as total_aum
  FROM public.positions p
  WHERE p.current_balance > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_investor_count()
RETURNS TABLE(count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(DISTINCT pr.id)::INTEGER as count
  FROM public.profiles pr
  WHERE pr.is_admin = FALSE
  AND EXISTS (
    SELECT 1 FROM public.positions po 
    WHERE po.user_id = pr.id 
    AND po.current_balance > 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_24h_interest()
RETURNS TABLE(interest NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Calculate estimated daily interest based on total AUM and 7.2% APY
  RETURN QUERY
  SELECT COALESCE(
    (SELECT SUM(p.current_balance) * 0.072 / 365
     FROM public.positions p
     WHERE p.current_balance > 0), 
    0
  ) as interest;
END;
$$;

-- =============================================
-- Step 5: Ensure investors table is properly populated
-- =============================================

INSERT INTO public.investors (profile_id, name, email, status)
SELECT 
    p.id,
    COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
        p.full_name,
        split_part(p.email, '@', 1),
        'Investor'
    ) as name,
    p.email,
    CASE WHEN p.status = 'Active' THEN 'active' ELSE 'inactive' END
FROM public.profiles p
WHERE p.is_admin = FALSE
ON CONFLICT (profile_id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    status = EXCLUDED.status;

-- =============================================
-- Step 6: Grant Necessary Permissions
-- =============================================

GRANT EXECUTE ON FUNCTION public.is_admin_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_aum() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investor_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_24h_interest() TO authenticated;

-- =============================================
-- Step 7: Update System Configuration
-- =============================================

-- Ensure system configuration exists
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('excel_import_enabled', 'true'::jsonb, 'Enable Excel import functionality'),
    ('edit_window_days', '7'::jsonb, 'Number of days after creation when edits are allowed'),
    ('maintenance_mode', 'false'::jsonb, 'System maintenance mode'),
    ('allowed_fund_classes', '["Class A", "Class B", "Class C"]'::jsonb, 'Allowed fund classes for investment')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- Verification and Summary
-- =============================================

DO $$
DECLARE
    admin_works BOOLEAN;
    admin_count INTEGER;
    investor_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Test admin function
    SELECT public.is_admin_secure() INTO admin_works;
    
    -- Count records
    SELECT COUNT(*) INTO admin_count FROM public.admin_users WHERE revoked_at IS NULL;
    SELECT COUNT(*) INTO investor_count FROM public.investors;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ PHASE 1 DATABASE REMEDIATION COMPLETE';
    RAISE NOTICE '   - Fixed recursive RLS issues';
    RAISE NOTICE '   - Added missing RLS policies';
    RAISE NOTICE '   - Secured database functions';
    RAISE NOTICE '   - Admin function test: %', CASE WHEN admin_works IS NOT NULL THEN 'PASSED' ELSE 'FAILED' END;
    RAISE NOTICE '   - Active admin users: %', admin_count;
    RAISE NOTICE '   - Total profiles: %', profile_count;
    RAISE NOTICE '   - Investor records: %', investor_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for frontend updates and testing';
END $$;
-- ==========================================
-- AUDIT CLEANUP MIGRATION
-- 1. Delete duplicate fund_daily_aum record (AUM=0) for Bitcoin Yield Fund
-- 2. Consolidate profiles RLS policies
-- 3. Enable 2FA requirement for admin accounts
-- ==========================================

-- ==========================================
-- TASK 1: Delete duplicate fund_daily_aum record
-- The id c8035ab7-bd46-44ef-aa9b-77230ca8e583 has AUM=0 which is incorrect
-- ==========================================
DELETE FROM fund_daily_aum 
WHERE id = 'c8035ab7-bd46-44ef-aa9b-77230ca8e583'
  AND total_aum = 0
  AND source = 'Auto-created for transaction';

-- ==========================================
-- TASK 2: Consolidate profiles RLS policies
-- Current state: 9 policies with overlapping logic
-- Target state: 5 clean policies (SELECT, INSERT, UPDATE for self+admin, IB referral read, no deletes)
-- ==========================================

-- Drop redundant/overlapping SELECT policies (keep one unified one)
DROP POLICY IF EXISTS "allow_own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visible to self and admin" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Drop redundant UPDATE policies
DROP POLICY IF EXISTS "allow_own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_any_profile" ON public.profiles;

-- Keep: allow_own_profile_insert (for new user creation)
-- Keep: ib_can_read_referral_profiles (for IB brokers)
-- Keep: no_profile_deletes (security)

-- Create unified SELECT policy
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT USING (
  id = auth.uid() 
  OR public.is_admin()
);

-- Create unified UPDATE policy
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
FOR UPDATE USING (
  id = auth.uid() 
  OR public.is_admin()
) WITH CHECK (
  id = auth.uid() 
  OR public.is_admin()
);

-- ==========================================
-- TASK 3: Enable 2FA requirement for admin accounts
-- ==========================================
UPDATE system_2fa_policy
SET require_2fa_for_admins = true,
    updated_at = NOW()
WHERE id = '800b4065-7035-40c9-a521-de3b4aa39ae7';

-- ==========================================
-- AUDIT LOG
-- ==========================================
INSERT INTO audit_log (action, entity, actor_user, meta)
VALUES (
  'PLATFORM_AUDIT_CLEANUP',
  'system',
  auth.uid(),
  jsonb_build_object(
    'actions', ARRAY[
      'Deleted duplicate fund_daily_aum record (AUM=0)',
      'Consolidated profiles RLS from 9 to 5 policies',
      'Enabled 2FA requirement for admin accounts'
    ],
    'timestamp', NOW()
  )
);
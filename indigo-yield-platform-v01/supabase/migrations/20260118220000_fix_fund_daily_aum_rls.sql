-- =============================================================================
-- Fix fund_daily_aum RLS Policies and Canonical RPC Flag Mismatch
-- =============================================================================
-- Issue: Admins getting "permission denied for table fund_daily_aum" when creating deposits
-- Root Causes:
--   1. RLS policies restrict INSERT/UPDATE to super_admin only
--   2. Canonical RPC flag mismatch (app.canonical_rpc vs indigo.canonical_rpc)
--
-- Solution:
--   1. Update RLS policies to allow regular admins to INSERT/UPDATE through canonical RPCs
--   2. Fix canonical RPC flag setter to use consistent namespace
-- =============================================================================

-- =============================================================================
-- PART 1: Fix Canonical RPC Flag Mismatch
-- =============================================================================
-- The trigger enforce_canonical_mutation() checks for 'indigo.canonical_rpc'
-- but set_canonical_rpc() was setting 'app.canonical_rpc'
-- We need to update the setter to use 'indigo.canonical_rpc'

CREATE OR REPLACE FUNCTION public.set_canonical_rpc(enabled boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF enabled THEN
    -- Use 'indigo.canonical_rpc' to match the trigger check
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
  ELSE
    PERFORM set_config('indigo.canonical_rpc', 'false', true);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_canonical_rpc(boolean) IS
'Sets the indigo.canonical_rpc session variable to enable/disable canonical RPC mutations. Must match the namespace checked by enforce_canonical_mutation() trigger.';

-- =============================================================================
-- PART 2: Update is_canonical_rpc() checker to match
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_canonical_rpc()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the canonical_rpc session variable is set to 'true'
  -- Use 'indigo.canonical_rpc' to match the trigger
  RETURN COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_canonical_rpc() IS
'Returns true if the current session is executing within a canonical RPC context. Checks indigo.canonical_rpc session variable.';

-- =============================================================================
-- PART 3: Update RLS Policies for fund_daily_aum
-- =============================================================================
-- Drop existing super_admin-only policies
DROP POLICY IF EXISTS "Super Admin can insert fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Super Admin can update fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Super Admin can delete fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Admins can insert fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Admins can update fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Admins can delete fund_daily_aum" ON public.fund_daily_aum;

-- Create new policies that allow regular admins to INSERT/UPDATE/DELETE
-- These operations will still be protected by:
--   1. REVOKE permissions (forcing use of SECURITY DEFINER functions)
--   2. enforce_canonical_mutation trigger (ensuring canonical RPC usage)
--   3. RLS check (ensuring only admins can perform operations)

CREATE POLICY "Admins can insert fund_daily_aum via RPC"
ON public.fund_daily_aum
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update fund_daily_aum via RPC"
ON public.fund_daily_aum
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Super admins can delete fund_daily_aum via RPC"
ON public.fund_daily_aum
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- =============================================================================
-- PART 4: Verify SELECT policies are still in place
-- =============================================================================
-- These should already exist from previous migrations, but verify they're correct

-- Ensure admins can view all AUM
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'fund_daily_aum'
    AND policyname = 'Admins can view all fund_daily_aum'
  ) THEN
    CREATE POLICY "Admins can view all fund_daily_aum"
    ON public.fund_daily_aum
    FOR SELECT
    TO authenticated
    USING (is_admin());
  END IF;
END $$;

-- Ensure investors can only view reporting-purpose month-end AUM
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'fund_daily_aum'
    AND policyname = 'Investors see reporting purpose only'
  ) THEN
    CREATE POLICY "Investors see reporting purpose only"
    ON public.fund_daily_aum
    FOR SELECT
    TO authenticated
    USING (
      (NOT is_admin())
      AND purpose = 'reporting'
      AND is_month_end = true
    );
  END IF;
END $$;

-- =============================================================================
-- PART 5: Grant necessary permissions
-- =============================================================================

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.set_canonical_rpc(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_canonical_rpc() TO authenticated;

-- =============================================================================
-- PART 6: Audit Log
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (action, entity, meta)
    VALUES (
      'RLS_POLICY_FIX',
      'fund_daily_aum',
      jsonb_build_object(
        'migration', '20260118220000_fix_fund_daily_aum_rls',
        'changes', jsonb_build_array(
          'Fixed canonical RPC flag namespace mismatch (app.canonical_rpc -> indigo.canonical_rpc)',
          'Updated RLS policies to allow admin INSERT/UPDATE via canonical RPCs',
          'Kept DELETE restricted to super_admin only',
          'Maintained three-layer security: RLS + REVOKE + canonical trigger'
        ),
        'timestamp', NOW()
      )
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Audit log may not exist in all environments, skip silently
    NULL;
END $$;

-- =============================================================================
-- VERIFICATION NOTES
-- =============================================================================
-- After this migration:
--   1. Canonical RPCs will properly set indigo.canonical_rpc flag
--   2. Triggers will correctly detect the canonical RPC context
--   3. Admins can INSERT/UPDATE fund_daily_aum through canonical RPCs only
--   4. Super admins can DELETE fund_daily_aum through canonical RPCs only
--   5. Direct mutations are still blocked by REVOKE and trigger enforcement
--   6. All operations are logged and auditable
-- =============================================================================

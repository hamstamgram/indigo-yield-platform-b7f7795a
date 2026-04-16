
-- ============================================================
-- P0-A: Fix privilege escalation on user_roles
-- Drop the insecure INSERT policy that lets any user self-assign admin
-- ============================================================
DROP POLICY IF EXISTS "Allow role insert during signup" ON public.user_roles;

-- Create a SECURITY DEFINER function for safe default role assignment
-- Only assigns 'user' role — never admin/super_admin
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to profiles table (fires on new user profile creation)
DROP TRIGGER IF EXISTS trg_assign_default_role ON public.profiles;
CREATE TRIGGER trg_assign_default_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- ============================================================
-- P0-B: Fix storage bucket cross-user file access
-- Drop overly broad authenticated_select policies
-- ============================================================
DROP POLICY IF EXISTS "documents_bucket_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "statements_bucket_authenticated_select" ON storage.objects;

-- Add path-based ownership policy for documents bucket
-- Documents are stored as: {user_id}/...
CREATE POLICY "documents_select_own_or_admin"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (
      (auth.uid()::text = (storage.foldername(name))[1])
      OR is_admin()
    )
  );

-- ============================================================
-- P1: Add search_path to 20 unpatched functions
-- ============================================================
ALTER FUNCTION public.acquire_position_lock SET search_path = public;
ALTER FUNCTION public.enforce_canonical_position_mutation SET search_path = public;
ALTER FUNCTION public.cascade_void_to_allocations SET search_path = public;
ALTER FUNCTION public.enforce_canonical_transaction_mutation SET search_path = public;
ALTER FUNCTION public.enforce_transaction_via_rpc SET search_path = public;
ALTER FUNCTION public.get_fees_account_for_fund SET search_path = public;
ALTER FUNCTION public.get_position_at_date SET search_path = public;
ALTER FUNCTION public.log_aum_position_mismatch SET search_path = public;
ALTER FUNCTION public.nightly_aum_reconciliation SET search_path = public;
ALTER FUNCTION public.preview_segmented_yield_distribution SET search_path = public;
ALTER FUNCTION public.set_position_is_active SET search_path = public;
ALTER FUNCTION public.sync_profile_role_from_profiles SET search_path = public;
ALTER FUNCTION public.sync_profile_role_from_roles SET search_path = public;
ALTER FUNCTION public.touch_updated_at SET search_path = public;
ALTER FUNCTION public.validate_ib_parent_has_role SET search_path = public;
ALTER FUNCTION public.validate_withdrawal_request SET search_path = public;
ALTER FUNCTION public.run_v6_e2e_simulation SET search_path = public;
ALTER FUNCTION public.run_v6_user_simulation SET search_path = public;
ALTER FUNCTION public.run_v6_user_simulation_isolated SET search_path = public;
ALTER FUNCTION public.run_v6_void_simulation SET search_path = public;

-- ============================================================
-- P2: Drop redundant admin SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "ib_commission_ledger_select" ON public.ib_commission_ledger;
DROP POLICY IF EXISTS "platform_fee_ledger_select" ON public.platform_fee_ledger;

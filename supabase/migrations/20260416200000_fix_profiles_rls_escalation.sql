-- ============================================================
-- Fix PROFILES RLS ESCALATION (P0 — Lovable Security Scanner)
--
-- PROBLEM: profiles_update and profiles_update_own_restricted
-- allow ANY authenticated user to update ALL columns on their
-- own row, including is_admin, role, kyc_status, fee_pct,
-- ib_percentage, ib_parent_id, status. A user can set
-- is_admin = true and gain admin access.
--
-- FIX: Replace both policies with column-restricted versions
-- that exclude sensitive columns. Admin updates are already
-- covered by profiles_admin_full_access.
--
-- Sensitive columns (admin-only):
--   is_admin, role, kyc_status, fee_pct, ib_percentage,
--   ib_parent_id, status, is_system_account, totp_enabled,
--   totp_verified, include_in_reporting, ib_commission_source
--
-- Safe columns (user can self-update):
--   email, first_name, last_name, phone, avatar_url,
--   preferences, onboarding_date, entity_type, account_type
-- ============================================================

-- Drop the vulnerable policies
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own_restricted ON public.profiles;

-- New restricted self-update policy: only safe columns
-- USING: user can see their own row for update
-- WITH CHECK: ensures new rows also satisfy ownership + column guard
-- The column guard uses a trigger or CHECK expression; however
-- RLS policies in Supabase cannot restrict columns directly.
-- Instead, we use a two-policy approach:
--   1. This policy restricts WHO can update (self only)
--   2. A trigger enforces WHICH columns can change

CREATE POLICY profiles_update_own_safe ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create a trigger function that blocks updates to sensitive columns
-- by non-admin users. Admin updates go through profiles_admin_full_access
-- which bypasses this check (admins update via different policy).
CREATE OR REPLACE FUNCTION public.enforce_profiles_safe_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If the caller is admin, allow any column change
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Block changes to sensitive columns
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role';
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Cannot modify kyc_status';
  END IF;
  IF NEW.fee_pct IS DISTINCT FROM OLD.fee_pct THEN
    RAISE EXCEPTION 'Cannot modify fee_pct';
  END IF;
  IF NEW.ib_percentage IS DISTINCT FROM OLD.ib_percentage THEN
    RAISE EXCEPTION 'Cannot modify ib_percentage';
  END IF;
  IF NEW.ib_parent_id IS DISTINCT FROM OLD.ib_parent_id THEN
    RAISE EXCEPTION 'Cannot modify ib_parent_id';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status';
  END IF;
  IF NEW.is_system_account IS DISTINCT FROM OLD.is_system_account THEN
    RAISE EXCEPTION 'Cannot modify is_system_account';
  END IF;
  IF NEW.totp_enabled IS DISTINCT FROM OLD.totp_enabled THEN
    RAISE EXCEPTION 'Cannot modify totp_enabled';
  END IF;
  IF NEW.totp_verified IS DISTINCT FROM OLD.totp_verified THEN
    RAISE EXCEPTION 'Cannot modify totp_verified';
  END IF;
  IF NEW.include_in_reporting IS DISTINCT FROM OLD.include_in_reporting THEN
    RAISE EXCEPTION 'Cannot modify include_in_reporting';
  END IF;
  IF NEW.ib_commission_source IS DISTINCT FROM OLD.ib_commission_source THEN
    RAISE EXCEPTION 'Cannot modify ib_commission_source';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger
DROP TRIGGER IF EXISTS enforce_profiles_safe_columns ON public.profiles;
CREATE TRIGGER enforce_profiles_safe_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_safe_columns();

-- Revoke anon execute on the trigger function
REVOKE EXECUTE ON FUNCTION public.enforce_profiles_safe_columns() FROM anon;
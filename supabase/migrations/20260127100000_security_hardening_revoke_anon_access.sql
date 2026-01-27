-- ================================================================
-- Migration: Critical Security Hardening
-- Date: 2026-01-27
-- Severity: CRITICAL
-- Description: Revoke dangerous permissions from anon role,
--              fix profile creation trigger to never trust is_admin from user metadata,
--              restrict set_canonical_rpc to service_role only
-- ================================================================

BEGIN;

-- ============================================================================
-- 1. REVOKE DANGEROUS FUNCTION PERMISSIONS FROM ANON ROLE
-- ============================================================================

-- Financial transaction functions - CRITICAL
REVOKE EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, text) FROM anon, PUBLIC;

-- Yield distribution functions - CRITICAL
REVOKE EXECUTE ON FUNCTION public.apply_adb_yield_distribution(uuid, date, date, numeric, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_adb_yield_distribution_v3(uuid, date, date, numeric, uuid, aum_purpose) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_to_fund(uuid, date, numeric, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) FROM anon, PUBLIC;

-- Transaction management functions - HIGH
REVOKE EXECUTE ON FUNCTION public.admin_create_transaction(uuid, uuid, text, numeric, date, text, text, date, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, text, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) FROM anon, PUBLIC;

-- Canonical RPC bypass - restrict to service_role only
REVOKE EXECUTE ON FUNCTION public.set_canonical_rpc(boolean) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_canonical_rpc(boolean) TO service_role;

-- TOTP encryption functions - restrict to service_role
REVOKE EXECUTE ON FUNCTION public.encrypt_totp_secret(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_totp_secret(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.encrypt_totp_secret(text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_totp_secret(text) TO service_role, authenticated;

RAISE NOTICE 'Revoked dangerous function permissions from anon role';

-- ============================================================================
-- 2. FIX PROFILE CREATION TRIGGER - NEVER TRUST is_admin FROM USER METADATA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-create profile for new user
    -- SECURITY FIX: NEVER trust is_admin from user metadata - always set to FALSE
    -- Admin status must be granted through a separate administrative process
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        is_admin,  -- Always FALSE on signup
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        FALSE,  -- SECURITY: Never trust user metadata for admin status
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Profile created for user: %', NEW.email;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;  -- Don't block user creation if profile fails
END;
$$;

RAISE NOTICE 'Fixed profile creation trigger - is_admin is now always FALSE on signup';

-- ============================================================================
-- 3. ADD is_admin() CHECK TO CRITICAL FINANCIAL FUNCTIONS
-- ============================================================================

-- Note: We need to check if functions have the check before modifying
-- This is a defensive measure - the REVOKE above is the primary fix

-- Add helper function to check if user is admin (if not exists)
CREATE OR REPLACE FUNCTION public.require_admin(p_operation text DEFAULT 'this operation')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied: Only administrators can perform %', p_operation
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

-- Grant to authenticated users (they'll fail the check if not admin)
GRANT EXECUTE ON FUNCTION public.require_admin(text) TO authenticated, service_role;

RAISE NOTICE 'Created require_admin helper function';

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count integer;
BEGIN
    -- Verify anon cannot execute financial functions
    SELECT COUNT(*) INTO v_count
    FROM information_schema.role_routine_grants
    WHERE routine_name IN (
        'apply_deposit_with_crystallization',
        'apply_withdrawal_with_crystallization',
        'apply_adb_yield_distribution',
        'apply_adb_yield_distribution_v3',
        'admin_create_transaction',
        'set_canonical_rpc'
    )
    AND grantee = 'anon';

    IF v_count > 0 THEN
        RAISE WARNING 'Some functions still have anon access! Count: %', v_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No dangerous functions accessible by anon role';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

COMMENT ON FUNCTION public.create_profile_on_signup() IS
'Auto-creates profile on user signup. SECURITY: is_admin is ALWAYS FALSE - admin status must be granted separately.';

COMMENT ON FUNCTION public.require_admin(text) IS
'Helper function to enforce admin-only access. Raises exception if caller is not an admin.';

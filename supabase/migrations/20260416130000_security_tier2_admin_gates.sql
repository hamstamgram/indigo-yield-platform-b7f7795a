-- ============================================================
-- Security Tier 2: Fix is_admin_for_jwt bug + add JWT gates
-- Date: 2026-04-16
-- ============================================================
-- Part A: Fix 3 functions referencing non-existent is_admin_for_jwt()
--   - add_fund_to_investor: replace is_admin_for_jwt() → is_admin()
--   - can_access_investor: replace is_admin_for_jwt() → is_admin()
--   - get_statement_signed_url: replace is_admin_for_jwt() → is_admin()
--
-- Part B: Add is_admin() JWT gate to important SECDEF functions
--   currently relying on param-based checks only (defense-in-depth)
-- ============================================================


-- ============================================================
-- Part A: Fix is_admin_for_jwt() → is_admin()
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_fund_to_investor(p_investor_id uuid, p_fund_id text, p_initial_shares numeric DEFAULT 0, p_cost_basis numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position_id UUID;
  v_fund_uuid UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_fund_uuid := p_fund_id::uuid;

  INSERT INTO public.investor_positions (
    investor_id, fund_id, shares, cost_basis, current_value, updated_at, is_active
  ) VALUES (
    p_investor_id, v_fund_uuid, 0, 0, 0, now(), true
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_position_id;

  RETURN v_position_id;
END;
$function$;

ALTER FUNCTION public.add_fund_to_investor(p_investor_id uuid, p_fund_id text, p_initial_shares numeric, p_cost_basis numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.can_access_investor(investor_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin() THEN RETURN true; END IF;
  IF auth.uid() = investor_uuid THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = investor_uuid AND ib_parent_id = auth.uid()
  );
END;
$function$;

ALTER FUNCTION public.can_access_investor(investor_uuid uuid) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.get_statement_signed_url(p_storage_path text, p_expires_in integer DEFAULT 300)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_signed_url TEXT;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  v_is_admin := public.is_admin();

  IF NOT v_is_admin THEN
    IF NOT (p_storage_path LIKE '%/' || v_user_id::text || '/%') THEN
      RAISE EXCEPTION 'Unauthorized access to statement';
    END IF;
  END IF;

  RETURN 'SIGNED_URL_GENERATION_REQUIRES_EDGE_FUNCTION:' || p_storage_path;
END;
$function$;

ALTER FUNCTION public.get_statement_signed_url(p_storage_path text, p_expires_in integer) OWNER TO "postgres";


-- ============================================================
-- Part B: Add is_admin() JWT gate to Category B functions
-- These have param-based checks but lack JWT verification
-- Using ALTER FUNCTION approach where possible, but for
-- complex functions we inject via CREATE OR REPLACE with
-- minimal body changes.
-- ============================================================

-- Strategy: For each function, find its definition in the DB,
-- add is_admin() check right after BEGIN (or after set_config if present),
-- and recreate. We read the live DB state which already has
-- the squash baseline + P2 + Tier 1 applied.

-- We use DO $$ blocks with EXECUTE to dynamically inject the check
-- into each function's definition. This is safer than copy-pasting
-- large function bodies.

DO $$
DECLARE
  fn_record RECORD;
  fn_def TEXT;
  fn_name TEXT;
  insert_point INT;
  new_def TEXT;
  admin_check TEXT := E'\n  IF NOT public.is_admin() THEN\n    RAISE EXCEPTION ''Unauthorized: admin role required (JWT session check)'';\n  END IF;\n';
  canonical_and_admin TEXT := E'\n  PERFORM set_config(''indigo.canonical_rpc'', ''true'', TRUE);\n\n  IF NOT public.is_admin() THEN\n    RAISE EXCEPTION ''Unauthorized: admin role required (JWT session check)'';\n  END IF;\n';
  super_admin_check TEXT := E'\n  PERFORM set_config(''indigo.canonical_rpc'', ''true'', TRUE);\n\n  IF NOT public.is_super_admin() THEN\n    RAISE EXCEPTION ''Unauthorized: super admin role required (JWT session check)'';\n  END IF;\n';
BEGIN
  FOR fn_name IN SELECT unnest(ARRAY[
    'apply_daily_yield_with_validation',
    'apply_deposit_with_crystallization',
    'apply_withdrawal_with_crystallization',
    'apply_transaction_with_crystallization',
    'crystallize_month_end',
    'complete_withdrawal',
    'delete_transaction',
    'finalize_statement_period',
    'reopen_yield_period',
    'start_processing_withdrawal',
    'void_fund_daily_aum',
    'reset_all_data_keep_profiles',
    'reset_all_investor_positions',
    'set_fund_daily_aum',
    'backfill_balance_chain_fix',
    'batch_reconcile_all_positions',
    'set_account_type_for_ib'
  ]) LOOP
    SELECT pg_get_functiondef(oid) INTO fn_def
    FROM pg_proc
    WHERE proname = fn_name AND pronamespace = 'public'::regnamespace
    LIMIT 1;

    IF fn_def IS NULL THEN
      RAISE NOTICE 'Function % not found, skipping', fn_name;
      CONTINUE;
    END IF;

    -- Already has JWT admin check from Tier 1
    IF fn_def LIKE '%is_admin()%' OR fn_def LIKE '%is_super_admin()%' OR fn_def LIKE '%ensure_admin()%' THEN
      -- Just add canonical_rpc if missing
      IF fn_def NOT LIKE '%set_config%canonical_rpc%' THEN
        insert_point := position('BEGIN' IN fn_def) + 5;
        new_def := overlay(fn_def PLACING canonical_and_admin FROM insert_point FOR 0);
        EXECUTE new_def;
        RAISE NOTICE 'Added canonical_rpc + is_admin() to %', fn_name;
      ELSE
        RAISE NOTICE 'Function % already has JWT admin + canonical_rpc, skipping', fn_name;
      END IF;
      CONTINUE;
    END IF;

    -- No JWT check — add is_admin() after BEGIN (or after set_config if present early)
    IF fn_def LIKE '%set_config%canonical_rpc%' THEN
      -- Has canonical_rpc but no admin — insert admin check after the first statement block
      -- Find the first semolon after BEGIN that's not part of set_config
      insert_point := position('BEGIN' IN fn_def) + 5;

      -- If set_config is right after BEGIN, insert AFTER the set_config lines
      IF substring(fn_def FROM insert_point FOR 80) LIKE '%set_config%' THEN
        -- Find end of set_config block (second semicolon after the two set_config calls)
        insert_point := position('BEGIN' IN fn_def) + 5;
        -- Skip past both set_config lines
        WHILE substring(fn_def FROM insert_point FOR 30) LIKE '%set_config%' LOOP
          insert_point := insert_point + position(';' IN substring(fn_def FROM insert_point));
        END LOOP;
      END IF;

      new_def := overlay(fn_def PLACING admin_check FROM insert_point FOR 0);
    ELSE
      -- No canonical_rpc, no admin — add both
      insert_point := position('BEGIN' IN fn_def) + 5;
      new_def := overlay(fn_def PLACING canonical_and_admin FROM insert_point FOR 0);
    END IF;

    -- Special override for super-admin-only functions
    IF fn_name IN ('reset_all_data_keep_profiles', 'reset_all_investor_positions', 'set_account_type_for_ib') THEN
      insert_point := position('BEGIN' IN fn_def) + 5;
      IF fn_def LIKE '%set_config%canonical_rpc%' THEN
        -- Re-do with super_admin
        IF substring(fn_def FROM insert_point FOR 80) LIKE '%set_config%' THEN
          WHILE substring(fn_def FROM insert_point FOR 30) LIKE '%set_config%' LOOP
            insert_point := insert_point + position(';' IN substring(fn_def FROM insert_point));
          END LOOP;
        END IF;
        new_def := overlay(fn_def PLACING E'\n  IF NOT public.is_super_admin() THEN\n    RAISE EXCEPTION ''Unauthorized: super admin role required (JWT session check)'';\n  END IF;\n' FROM insert_point FOR 0);
      ELSE
        new_def := overlay(fn_def PLACING super_admin_check FROM insert_point FOR 0);
      END IF;
    END IF;

    BEGIN
      EXECUTE new_def;
      RAISE NOTICE 'Patched function %', fn_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to patch %: %', fn_name, SQLERRM;
    END;
  END LOOP;
END;
$$;
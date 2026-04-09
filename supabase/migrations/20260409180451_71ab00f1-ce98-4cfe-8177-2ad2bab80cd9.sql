-- =============================================================================
-- Deep DB Audit: Drop overloads, dead functions, dead tables, fix trigger
-- =============================================================================

-- 1. Drop dangerous 9-param apply_investor_transaction overload
--    (keep the 10-param version with p_distribution_id DEFAULT NULL)
DROP FUNCTION IF EXISTS public.apply_investor_transaction(
  uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose
);

-- 2. Drop dead 3-param route_withdrawal_to_fees overload
--    (keep the 2-param version)
DROP FUNCTION IF EXISTS public.route_withdrawal_to_fees(uuid, uuid, text);

-- 3. Drop V4 yield engine (superseded by V5)
DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution(uuid, date, numeric, uuid, aum_purpose, date);
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution(uuid, numeric, date);

-- 4. Drop 4 dev-only simulation functions
DROP FUNCTION IF EXISTS public.run_v6_e2e_simulation();
DROP FUNCTION IF EXISTS public.run_v6_user_simulation();
DROP FUNCTION IF EXISTS public.run_v6_user_simulation_isolated();
DROP FUNCTION IF EXISTS public.run_v6_void_simulation();

-- 5. Drop debug artifact table
DROP TABLE IF EXISTS public._temp_function_dump CASCADE;

-- 6. Drop orphaned user_sessions table
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- 7. Fix trigger message to reference V5
CREATE OR REPLACE FUNCTION public.enforce_canonical_yield_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_canonical_rpc()
     OR current_setting('indigo.allow_yield_void', true) = 'true' THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RAISE EXCEPTION
    'CANONICAL_MUTATION_REQUIRED: Direct % on yield_distributions is blocked. '
    'Use canonical RPC: apply_segmented_yield_distribution_v5 or void_yield_distribution.', TG_OP
    USING HINT = 'Set indigo.canonical_rpc = true via PERFORM set_config(''indigo.canonical_rpc'', ''true'', true) inside your RPC function.',
          ERRCODE = 'P0001';
END;
$$;
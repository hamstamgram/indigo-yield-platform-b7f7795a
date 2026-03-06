-- ============================================================================
-- Migration: Enforce Canonical Mutation Paths
-- ============================================================================
-- This migration creates triggers that block direct INSERT/UPDATE/DELETE
-- operations on protected tables, forcing all mutations to go through
-- the canonical RPC functions.
--
-- Protected Tables:
-- - transactions_v2
-- - yield_distributions
-- - fund_aum_events
-- - fund_daily_aum
--
-- The triggers check for a session variable `app.canonical_rpc` that is
-- set by the canonical RPC functions. Without this variable, mutations are blocked.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Check if operation is from canonical RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_canonical_rpc()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the canonical_rpc session variable is set to 'true'
  RETURN COALESCE(current_setting('app.canonical_rpc', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_canonical_rpc() IS
'Returns true if the current operation is being executed from a canonical RPC function.
Canonical RPC functions set app.canonical_rpc = true before performing mutations.';

-- ============================================================================
-- HELPER FUNCTION: Set canonical RPC flag
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_canonical_rpc(enabled boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF enabled THEN
    PERFORM set_config('app.canonical_rpc', 'true', true);
  ELSE
    PERFORM set_config('app.canonical_rpc', 'false', true);
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_canonical_rpc(boolean) IS
'Sets or clears the canonical RPC flag. Called by canonical RPC functions before mutations.';

-- ============================================================================
-- TRIGGER FUNCTION: Block non-canonical mutations to transactions_v2
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_transaction_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allowed_types text[] := ARRAY['SYSTEM_ADJUSTMENT', 'FEE_CREDIT', 'IB_CREDIT', 'IB_DEBIT', 'INTERNAL_CREDIT', 'INTERNAL_WITHDRAWAL'];
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Skip check for system-generated transactions
  IF TG_OP != 'DELETE' AND NEW.is_system_generated = true THEN
    RETURN NEW;
  END IF;

  -- Allow certain internal transaction types to bypass
  IF TG_OP != 'DELETE' AND NEW.type = ANY(v_allowed_types) THEN
    RETURN NEW;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on transactions_v2 is blocked. Use canonical RPC functions: apply_deposit_with_crystallization, apply_withdrawal_with_crystallization, admin_create_transaction, or void_transaction.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Block non-canonical mutations to yield_distributions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_yield_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on yield_distributions is blocked. Use canonical RPC functions: apply_daily_yield_to_fund_v3, void_yield_distribution, or apply_yield_correction_v2.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Block non-canonical mutations to fund_aum_events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_aum_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on fund_aum_events is blocked. Use canonical RPC functions: crystallize_yield_before_flow, ensure_preflow_aum, or set_fund_daily_aum.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Block non-canonical mutations to fund_daily_aum
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_daily_aum_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip check if canonical RPC flag is set
  IF public.is_canonical_rpc() THEN
    RETURN CASE TG_OP
      WHEN 'DELETE' THEN OLD
      ELSE NEW
    END;
  END IF;

  -- Block the mutation
  RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on fund_daily_aum is blocked. Use canonical RPC functions: set_fund_daily_aum, update_fund_daily_aum, or void_fund_daily_aum.', TG_OP
    USING HINT = 'Set app.canonical_rpc = true via set_canonical_rpc() in your RPC function.',
          ERRCODE = 'P0001';
END;
$$;

-- ============================================================================
-- CREATE TRIGGERS (with IF NOT EXISTS pattern)
-- ============================================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_canonical_transaction ON public.transactions_v2;
DROP TRIGGER IF EXISTS trg_enforce_canonical_yield ON public.yield_distributions;
DROP TRIGGER IF EXISTS trg_enforce_canonical_aum_event ON public.fund_aum_events;
DROP TRIGGER IF EXISTS trg_enforce_canonical_daily_aum ON public.fund_daily_aum;

-- Create triggers on protected tables
-- Note: These triggers run BEFORE the operation, allowing us to block it

CREATE TRIGGER trg_enforce_canonical_transaction
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_canonical_transaction_mutation();

CREATE TRIGGER trg_enforce_canonical_yield
  BEFORE INSERT OR UPDATE OR DELETE ON public.yield_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_canonical_yield_mutation();

CREATE TRIGGER trg_enforce_canonical_aum_event
  BEFORE INSERT OR UPDATE OR DELETE ON public.fund_aum_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_canonical_aum_event_mutation();

CREATE TRIGGER trg_enforce_canonical_daily_aum
  BEFORE INSERT OR UPDATE OR DELETE ON public.fund_daily_aum
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_canonical_daily_aum_mutation();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TRIGGER trg_enforce_canonical_transaction ON public.transactions_v2 IS
'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: apply_deposit_with_crystallization, apply_withdrawal_with_crystallization, admin_create_transaction, void_transaction.';

COMMENT ON TRIGGER trg_enforce_canonical_yield ON public.yield_distributions IS
'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: apply_daily_yield_to_fund_v3, void_yield_distribution, apply_yield_correction_v2.';

COMMENT ON TRIGGER trg_enforce_canonical_aum_event ON public.fund_aum_events IS
'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: crystallize_yield_before_flow, ensure_preflow_aum, set_fund_daily_aum.';

COMMENT ON TRIGGER trg_enforce_canonical_daily_aum ON public.fund_daily_aum IS
'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: set_fund_daily_aum, update_fund_daily_aum, void_fund_daily_aum.';

-- ============================================================================
-- UPDATE CANONICAL RPC FUNCTIONS TO SET THE FLAG
-- ============================================================================

-- NOTE: The existing canonical RPC functions need to be updated to call
-- set_canonical_rpc(true) at the beginning. This should be done by adding
-- the following line at the start of each canonical RPC function:
--
--   PERFORM public.set_canonical_rpc(true);
--
-- The flag is automatically cleared at the end of the transaction due to
-- the `true` parameter in set_config() which makes it transaction-local.

-- Example pattern for updating an existing RPC:
/*
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(...)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- ... existing function body ...

  -- Flag automatically clears at transaction end
END;
$$;
*/

-- ============================================================================
-- INTEGRITY VIEW: Check for bypassed mutations
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_canonical_mutation_check AS
WITH recent_transactions AS (
  SELECT
    id,
    type,
    is_system_generated,
    created_at,
    created_by
  FROM public.transactions_v2
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND is_system_generated = false
    AND type NOT IN ('SYSTEM_ADJUSTMENT', 'FEE_CREDIT', 'IB_CREDIT', 'IB_DEBIT', 'INTERNAL_CREDIT', 'INTERNAL_WITHDRAWAL')
)
SELECT
  'transactions_v2' as table_name,
  COUNT(*) as record_count,
  'Recent non-system transactions (should all be via canonical RPC)' as description
FROM recent_transactions
UNION ALL
SELECT
  'yield_distributions' as table_name,
  COUNT(*) as record_count,
  'Recent yield distributions (should all be via canonical RPC)' as description
FROM public.yield_distributions
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT
  'fund_aum_events' as table_name,
  COUNT(*) as record_count,
  'Recent AUM events (should all be via canonical RPC)' as description
FROM public.fund_aum_events
WHERE created_at > NOW() - INTERVAL '24 hours';

COMMENT ON VIEW public.v_integrity_canonical_mutation_check IS
'Shows recent mutations to protected tables. All should be created via canonical RPC functions.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_canonical_rpc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_canonical_rpc(boolean) TO authenticated;
GRANT SELECT ON public.v_integrity_canonical_mutation_check TO authenticated;

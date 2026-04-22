-- ============================================================
-- Move _test_reset_transactional_state from public to e2e schema
-- Date: 2026-04-22
--
-- The original migration (20260420100000) placed the destructive
-- test-reset helper in `public`. This migration:
--
--   1. Creates the `e2e` schema (if not exists).
--   2. Recreates the function under `e2e._test_reset_transactional_state`.
--   3. Drops `public._test_reset_transactional_state`.
--   4. Leaves a stub in `public` that raises an exception pointing
--      callers to the new location — so any stale reference fails
--      loudly instead of silently doing nothing.
--
-- Why a separate schema?
--   The `e2e` schema is exclusively for test/E2E helpers. It makes
--   production audits trivial: "does the e2e schema exist? then these
--   functions are available but gated." It also allows future work to
--   strip the schema entirely from production builds if desired.
--
-- The dual-gate (require_admin + indigo.test_mode) remains in place.
-- ============================================================

-- Step 1: Create the e2e schema
CREATE SCHEMA IF NOT EXISTS e2e;

-- Step 2: Recreate the function under e2e schema
-- (Full body copied from 20260420100000 with schema references updated)
CREATE OR REPLACE FUNCTION e2e._test_reset_transactional_state(
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode text;
  v_counts jsonb;
BEGIN
  PERFORM public.require_admin('_test_reset_transactional_state', p_admin_id);

  v_mode := current_setting('indigo.test_mode', true);
  IF v_mode IS NULL OR v_mode <> 'on' THEN
    RAISE EXCEPTION 'test_mode not enabled — refusing to reset transactional state'
      USING ERRCODE = '42501';
  END IF;

  PERFORM public.set_canonical_rpc(true);

  ALTER TABLE public.transactions_v2     DISABLE TRIGGER USER;
  ALTER TABLE public.investor_positions  DISABLE TRIGGER USER;
  ALTER TABLE public.fund_daily_aum      DISABLE TRIGGER USER;
  ALTER TABLE public.yield_distributions DISABLE TRIGGER USER;
  ALTER TABLE public.ib_allocations      DISABLE TRIGGER USER;

  SELECT jsonb_build_object(
    'transactions_v2',        (SELECT count(*) FROM public.transactions_v2),
    'investor_positions',     (SELECT count(*) FROM public.investor_positions),
    'yield_allocations',      (SELECT count(*) FROM public.yield_allocations),
    'fee_allocations',        (SELECT count(*) FROM public.fee_allocations),
    'ib_commission_ledger',   (SELECT count(*) FROM public.ib_commission_ledger),
    'ib_allocations',         (SELECT count(*) FROM public.ib_allocations),
    'platform_fee_ledger',    (SELECT count(*) FROM public.platform_fee_ledger),
    'investor_yield_events',  (SELECT count(*) FROM public.investor_yield_events),
    'yield_distributions',    (SELECT count(*) FROM public.yield_distributions),
    'fund_daily_aum',         (SELECT count(*) FROM public.fund_daily_aum),
    'withdrawal_requests',    (SELECT count(*) FROM public.withdrawal_requests)
  ) INTO v_counts;

  DELETE FROM public.ib_allocations;
  DELETE FROM public.ib_commission_ledger;
  DELETE FROM public.platform_fee_ledger;
  DELETE FROM public.fee_allocations;
  DELETE FROM public.yield_allocations;
  DELETE FROM public.investor_yield_events;
  DELETE FROM public.yield_distributions;
  DELETE FROM public.withdrawal_requests;
  DELETE FROM public.fund_daily_aum;
  DELETE FROM public.investor_positions;
  DELETE FROM public.transactions_v2;

  ALTER TABLE public.transactions_v2     ENABLE TRIGGER USER;
  ALTER TABLE public.investor_positions  ENABLE TRIGGER USER;
  ALTER TABLE public.fund_daily_aum      ENABLE TRIGGER USER;
  ALTER TABLE public.yield_distributions ENABLE TRIGGER USER;
  ALTER TABLE public.ib_allocations      ENABLE TRIGGER USER;

  PERFORM public.set_canonical_rpc(false);

  RETURN v_counts;
END;
$$;

REVOKE ALL ON FUNCTION e2e._test_reset_transactional_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION e2e._test_reset_transactional_state(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION e2e._test_reset_transactional_state(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION e2e._test_reset_transactional_state(uuid) IS
  'E2E helper — dual-gated (require_admin + indigo.test_mode=on). Accepts p_admin_id override for MCP / service_role contexts where auth.uid() is NULL. Wipes transactional tables only. Preserves profiles/funds/config/auth.';

-- Step 3: Drop the function from public schema
DROP FUNCTION IF EXISTS public._test_reset_transactional_state(uuid);

-- Step 4: Leave a stub in public that fails loudly if any stale code
--         still references the old location.
CREATE OR REPLACE FUNCTION public._test_reset_transactional_state(
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '_test_reset_transactional_state has moved to the e2e schema. Call e2e._test_reset_transactional_state() instead.'
    USING ERRCODE = '42883';
END;
$$;

REVOKE ALL ON FUNCTION public._test_reset_transactional_state(uuid) FROM PUBLIC;
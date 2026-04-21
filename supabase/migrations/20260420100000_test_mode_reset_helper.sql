-- ============================================================
-- E2E test-mode reset helper
-- Date: 2026-04-20
-- Dual-gated: require_admin(NULL, p_admin_id) + indigo.test_mode session flag
-- Wipes ONLY transactional tables; preserves profiles, funds, config, auth.
--
-- Why this is safe despite the canonical-RPC triggers:
--   1. set_canonical_rpc(true) flips indigo.canonical_rpc=true for the
--      transaction, which the four canonical-enforcement triggers
--      (transactions_v2, investor_positions, yield_distributions,
--      fund_daily_aum) short-circuit on.
--   2. ALTER TABLE ... DISABLE TRIGGER USER suspends all user triggers on
--      the four cache/sync tables for the wipe window, then re-enables
--      them. Any FK violation would still surface — we control order.
--   3. Gate 2 (indigo.test_mode='on') ensures this path is unreachable
--      outside an opt-in E2E session.
--
-- p_admin_id is accepted so MCP / service_role callers (where auth.uid()
-- is NULL) can satisfy the admin gate by passing a known admin UUID.
-- ============================================================

CREATE OR REPLACE FUNCTION public._test_reset_transactional_state(
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

  -- ib_allocations must precede yield_distributions/transactions_v2 because
  -- both FKs use ON DELETE SET NULL, and its protect_allocation_immutable_fields
  -- trigger rejects the column change triggered by SET NULL (even DISABLED,
  -- the cascade still fires on the parent side before the child trigger).
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

REVOKE ALL ON FUNCTION public._test_reset_transactional_state(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._test_reset_transactional_state(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public._test_reset_transactional_state(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public._test_reset_transactional_state(uuid) IS
  'E2E helper — dual-gated (require_admin + indigo.test_mode=on). Accepts p_admin_id override for MCP / service_role contexts where auth.uid() is NULL. Wipes transactional tables only. Preserves profiles/funds/config/auth.';

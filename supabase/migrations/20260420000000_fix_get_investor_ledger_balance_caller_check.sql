-- ============================================================
-- Compensating fix: add caller-isolation gate to
--   public.get_investor_ledger_balance(uuid, uuid)
-- Original migration: 20260417210000_ledger_balance_rpc.sql
-- Issue: the SECDEF function did not check that auth.uid() owned
--        p_investor_id, so any authenticated user could read any
--        investor's ledger balance. RLS did not apply because the
--        function selects as postgres.
-- Fix: short-circuit when the caller is admin (require_admin path)
--      or when can_access_investor(p_investor_id) is true.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_investor_ledger_balance(
  p_investor_id uuid,
  p_fund_id uuid
) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance numeric;
  v_is_admin boolean;
BEGIN
  -- Admin bypass (is_admin checks user_roles for admin/super_admin)
  v_is_admin := public.is_admin();

  IF NOT v_is_admin AND NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: caller cannot access investor %', p_investor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST_SWEEP') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'DUST') THEN -ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false;

  RETURN v_balance;
END;
$$;

COMMENT ON FUNCTION public.get_investor_ledger_balance(uuid, uuid) IS
  'Compute investor balance from transaction ledger. Gated: admin OR can_access_investor(p_investor_id). (Gate added 2026-04-20.)';

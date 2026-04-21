-- ============================================================
-- CRITICAL: RPC for transaction-derived position (source of truth)
-- Date: 2026-04-17
-- SECURITY: this original shipped without a caller gate.
--   Compensating migration 20260420000000_fix_get_investor_ledger_balance_caller_check.sql
--   adds the require_admin / can_access_investor gate. Fresh deploys
--   replay both; prod was patched on 2026-04-20.
-- ============================================================
-- investor_positions is a derived/cached table that can drift
-- from the transaction ledger. For financial decisions
-- (withdrawal amounts, full-exit previews, AUM), we need
-- the authoritative balance computed from the ledger.
--
-- This RPC computes the current balance from SUM of
-- non-voided transactions for an investor+fund pair.
-- It does NOT update investor_positions — it only returns
-- the computed value for the caller to use.
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
BEGIN
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

ALTER FUNCTION public.get_investor_ledger_balance(uuid, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_investor_ledger_balance(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_investor_ledger_balance(uuid, uuid) IS 'Compute investor balance from transaction ledger (source of truth). For financial decisions where position cache must not be stale.';
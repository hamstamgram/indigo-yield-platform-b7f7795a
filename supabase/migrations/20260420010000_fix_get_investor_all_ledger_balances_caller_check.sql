-- ============================================================
-- Compensating fix: add caller-isolation gate to
--   public.get_investor_all_ledger_balances(uuid)
-- Original migration: 20260417220000_ledger_derived_aum_rpcs.sql
-- Issue: SECDEF function did not check caller access to p_investor_id.
-- Fix: short-circuit when caller is admin OR can_access_investor is true.
-- get_funds_with_aum() in the same original migration is intentionally
-- ungated (aggregate fund metadata, no per-investor leak).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_investor_all_ledger_balances(
  p_investor_id uuid
)
RETURNS TABLE(
  fund_id uuid,
  fund_name text,
  fund_code text,
  asset text,
  balance numeric,
  cost_basis numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() AND NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: caller cannot access investor %', p_investor_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    f.id AS fund_id,
    f.name AS fund_name,
    f.code AS fund_code,
    f.asset,
    COALESCE(SUM(
      CASE
        WHEN tx.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST_SWEEP') THEN tx.amount
        WHEN tx.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'DUST') THEN -ABS(tx.amount)
        WHEN tx.type = 'ADJUSTMENT' THEN tx.amount
        ELSE 0
      END
    ), 0) AS balance,
    COALESCE(SUM(
      CASE
        WHEN tx.type = 'DEPOSIT' THEN tx.amount
        WHEN tx.type = 'WITHDRAWAL' THEN -ABS(tx.amount)
        WHEN tx.type = 'ADJUSTMENT' THEN tx.amount
        ELSE 0
      END
    ), 0) AS cost_basis
  FROM funds f
  INNER JOIN transactions_v2 tx ON tx.fund_id = f.id
    AND tx.investor_id = p_investor_id
    AND tx.is_voided = false
  GROUP BY f.id
  HAVING COALESCE(SUM(
    CASE
      WHEN tx.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST_SWEEP') THEN tx.amount
      WHEN tx.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'DUST') THEN -ABS(tx.amount)
      WHEN tx.type = 'ADJUSTMENT' THEN tx.amount
      ELSE 0
    END
  ), 0) <> 0
  ORDER BY f.name;
END;
$$;

COMMENT ON FUNCTION public.get_investor_all_ledger_balances(uuid) IS
  'Compute all investor balances from transaction ledger. Gated: admin OR can_access_investor(p_investor_id). (Gate added 2026-04-20.)';

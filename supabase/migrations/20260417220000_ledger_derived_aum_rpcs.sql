-- ============================================================
-- Ledger-derived AUM and balance RPCs
-- Date: 2026-04-17
-- SECURITY: get_investor_all_ledger_balances originally shipped
--   without a caller gate; compensating migration
--   20260420010000_fix_get_investor_all_ledger_balances_caller_check.sql
--   adds the require_admin / can_access_investor gate on prod 2026-04-20.
--   get_funds_with_aum() remains intentionally ungated: is_admin is
--   not required — aggregate fund metadata is non-sensitive to
--   authenticated users (already shown in investor portal).
-- ============================================================
-- investor_positions is a derived/cached table that can drift
-- from the transaction ledger after voids, reissues, or
-- trigger failures. For display of financial data (dashboard
-- AUM, investor portfolio balances, fees account balances),
-- we MUST source from the transaction ledger.
--
-- This migration:
-- 1. Rewrites get_funds_with_aum() to compute AUM from
--    transactions_v2 instead of investor_positions
-- 2. Adds get_investor_all_ledger_balances(investor_id) for
--    per-investor portfolio display
-- ============================================================

-- 1. Rewrite get_funds_with_aum() to use ledger
CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE(
  fund_id uuid,
  fund_name text,
  fund_code text,
  asset text,
  fund_class text,
  status text,
  total_aum numeric,
  investor_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS fund_id,
    f.name AS fund_name,
    f.code AS fund_code,
    f.asset,
    f.fund_class,
    f.status::text,
    COALESCE(SUM(
      CASE WHEN tx.is_voided = false THEN
        CASE
          WHEN tx.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST_SWEEP') THEN tx.amount
          WHEN tx.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'DUST') THEN -ABS(tx.amount)
          WHEN tx.type = 'ADJUSTMENT' THEN tx.amount
          ELSE 0
        END
      ELSE 0
    END), 0) AS total_aum,
    COUNT(DISTINCT CASE
      WHEN tx.is_voided = false
        AND p.account_type = 'investor'
        AND (
          CASE
            WHEN tx.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'DUST_SWEEP') THEN tx.amount
            WHEN tx.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'DUST') THEN -ABS(tx.amount)
            WHEN tx.type = 'ADJUSTMENT' THEN tx.amount
            ELSE 0
          END
        ) > 0
      THEN tx.investor_id
    END) AS investor_count
  FROM funds f
  LEFT JOIN transactions_v2 tx ON tx.fund_id = f.id
  LEFT JOIN profiles p ON p.id = tx.investor_id
  GROUP BY f.id
  ORDER BY f.name;
END;
$$;

COMMENT ON FUNCTION public.get_funds_with_aum() IS 'Returns fund totals computed from transaction ledger (source of truth). total_aum sums all non-voided transactions; investor_count counts investors with positive ledger balance.';

-- 2. Add get_investor_all_ledger_balances for portfolio display
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

ALTER FUNCTION public.get_investor_all_ledger_balances(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_investor_all_ledger_balances(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_investor_all_ledger_balances(uuid) IS 'Compute all investor balances from transaction ledger (source of truth). Returns non-zero positions only. Used for portfolio display where position cache may be stale.';
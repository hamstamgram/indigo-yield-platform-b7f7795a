-- ============================================================================
-- P0 Fix 6: Fix v_ledger_reconciliation to exclude voided transactions
-- Date: 2026-01-16
-- Issue: View was including voided transactions in calculation, causing
--        false positive variance alerts
-- ============================================================================

BEGIN;

-- Ensure is_voided column exists on transactions_v2 (idempotent)
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false;
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS voided_by uuid;
ALTER TABLE transactions_v2 ADD COLUMN IF NOT EXISTS void_reason text;

-- 1. Fix Ledger Reconciliation: Exclude voided transactions
CREATE OR REPLACE VIEW public.v_ledger_reconciliation AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value AS position_balance,
  COALESCE(tx_summary.net_flow, 0) AS calculated_balance,
  ip.current_value - COALESCE(tx_summary.net_flow, 0) AS variance,
  ABS(ip.current_value - COALESCE(tx_summary.net_flow, 0)) > 0.0000000001 AS has_variance
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE
      WHEN t.type::text IN ('DEPOSIT', 'INTEREST', 'ADJUSTMENT') THEN t.amount
      WHEN t.type::text IN ('WITHDRAWAL', 'FEE') THEN -ABS(t.amount)
      ELSE t.amount
    END) AS net_flow
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id
    AND t.fund_id = ip.fund_id
    AND t.is_voided = false  -- CRITICAL: Exclude voided transactions
) tx_summary ON true
WHERE ABS(ip.current_value - COALESCE(tx_summary.net_flow, 0)) > 0.01;

COMMENT ON VIEW public.v_ledger_reconciliation IS
'Shows position/transaction mismatches (excluding voided). Empty = healthy. Variance > $0.01 indicates reconciliation issue.';

-- 2. Also fix v_position_transaction_variance to exclude voided transactions
CREATE OR REPLACE VIEW public.v_position_transaction_variance AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value AS position_value,
  ip.cost_basis,
  COALESCE(deposits.total, 0) AS total_deposits,
  COALESCE(withdrawals.total, 0) AS total_withdrawals,
  COALESCE(interest.total, 0) AS total_interest,
  COALESCE(fees.total, 0) AS total_fees,
  ip.current_value - (
    COALESCE(deposits.total, 0) -
    COALESCE(withdrawals.total, 0) +
    COALESCE(interest.total, 0) -
    COALESCE(fees.total, 0)
  ) AS balance_variance
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id
    AND fund_id = ip.fund_id
    AND type::text = 'DEPOSIT'
    AND is_voided = false  -- CRITICAL: Exclude voided
) deposits ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id
    AND fund_id = ip.fund_id
    AND type::text = 'WITHDRAWAL'
    AND is_voided = false  -- CRITICAL: Exclude voided
) withdrawals ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id
    AND fund_id = ip.fund_id
    AND type::text = 'INTEREST'
    AND is_voided = false  -- CRITICAL: Exclude voided
) interest ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id
    AND fund_id = ip.fund_id
    AND type::text = 'FEE'
    AND is_voided = false  -- CRITICAL: Exclude voided
) fees ON true
WHERE ABS(ip.current_value - (
  COALESCE(deposits.total, 0) -
  COALESCE(withdrawals.total, 0) +
  COALESCE(interest.total, 0) -
  COALESCE(fees.total, 0)
)) > 0.01;

COMMENT ON VIEW public.v_position_transaction_variance IS
'Detailed breakdown of position vs transaction variance (excluding voided). Empty = healthy.';

COMMIT;

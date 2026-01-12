-- Data Integrity Views for System Health Monitoring
-- These views detect anomalies, orphaned records, and conservation violations

-- 1. Ledger Reconciliation: Compare transaction totals vs position balances
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
      WHEN t.type IN ('DEPOSIT', 'INTEREST') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -ABS(t.amount)
      ELSE t.amount
    END) AS net_flow
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id
    AND t.fund_id = ip.fund_id
) tx_summary ON true
WHERE ABS(ip.current_value - COALESCE(tx_summary.net_flow, 0)) > 0.01;

COMMENT ON VIEW public.v_ledger_reconciliation IS 
'Shows position/transaction mismatches. Empty = healthy. Variance > $0.01 indicates reconciliation issue.';

-- 2. Fund AUM Mismatch: Detect fund AUM vs sum of positions
CREATE OR REPLACE VIEW public.fund_aum_mismatch AS
SELECT 
  f.id AS fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  COALESCE(nav.aum, 0) AS reported_aum,
  COALESCE(positions.total_value, 0) AS calculated_aum,
  COALESCE(nav.aum, 0) - COALESCE(positions.total_value, 0) AS variance,
  nav.nav_date AS last_nav_date
FROM funds f
LEFT JOIN LATERAL (
  SELECT aum, nav_date 
  FROM daily_nav 
  WHERE fund_id = f.id 
  ORDER BY nav_date DESC 
  LIMIT 1
) nav ON true
LEFT JOIN LATERAL (
  SELECT SUM(current_value) AS total_value
  FROM investor_positions
  WHERE fund_id = f.id
) positions ON true
WHERE ABS(COALESCE(nav.aum, 0) - COALESCE(positions.total_value, 0)) > 0.01;

COMMENT ON VIEW public.fund_aum_mismatch IS 
'Detects funds where reported AUM differs from sum of investor positions. Empty = healthy.';

-- 3. Orphaned Transactions: Transactions without valid profiles
CREATE OR REPLACE VIEW public.v_orphaned_transactions AS
SELECT 
  t.id AS transaction_id,
  t.investor_id,
  t.fund_id,
  t.type,
  t.amount,
  t.tx_date,
  t.created_at
FROM transactions_v2 t
LEFT JOIN profiles p ON p.id = t.investor_id
WHERE p.id IS NULL;

COMMENT ON VIEW public.v_orphaned_transactions IS 
'Transactions referencing non-existent profiles. Empty = healthy.';

-- 4. Orphaned Positions: Positions without valid profiles or funds
CREATE OR REPLACE VIEW public.v_orphaned_positions AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value,
  ip.updated_at,
  CASE WHEN p.id IS NULL THEN 'missing_profile' ELSE 'missing_fund' END AS orphan_type
FROM investor_positions ip
LEFT JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN funds f ON f.id = ip.fund_id
WHERE p.id IS NULL OR f.id IS NULL;

COMMENT ON VIEW public.v_orphaned_positions IS 
'Positions referencing non-existent profiles or funds. Empty = healthy.';

-- 5. Fee Calculation Orphans: Fee calculations without valid positions
CREATE OR REPLACE VIEW public.v_fee_calculation_orphans AS
SELECT 
  fc.id AS calculation_id,
  fc.investor_id,
  fc.fund_id,
  fc.fee_amount,
  fc.created_at
FROM fee_calculations fc
LEFT JOIN investor_positions ip ON ip.investor_id = fc.investor_id AND ip.fund_id = fc.fund_id
WHERE ip.investor_id IS NULL;

COMMENT ON VIEW public.v_fee_calculation_orphans IS 
'Fee calculations without valid investor positions. Empty = healthy.';

-- 6. Position vs Transaction Summary Check
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
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'DEPOSIT'
) deposits ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'WITHDRAWAL'
) withdrawals ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'INTEREST'
) interest ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'FEE'
) fees ON true
WHERE ABS(ip.current_value - (
  COALESCE(deposits.total, 0) - 
  COALESCE(withdrawals.total, 0) + 
  COALESCE(interest.total, 0) - 
  COALESCE(fees.total, 0)
)) > 0.01;

COMMENT ON VIEW public.v_position_transaction_variance IS 
'Detailed breakdown of position vs transaction totals. Empty = healthy.';

-- Grant access to authenticated users
GRANT SELECT ON public.v_ledger_reconciliation TO authenticated;
GRANT SELECT ON public.fund_aum_mismatch TO authenticated;
GRANT SELECT ON public.v_orphaned_transactions TO authenticated;
GRANT SELECT ON public.v_orphaned_positions TO authenticated;
GRANT SELECT ON public.v_fee_calculation_orphans TO authenticated;
GRANT SELECT ON public.v_position_transaction_variance TO authenticated;

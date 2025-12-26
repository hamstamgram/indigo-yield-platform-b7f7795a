-- INDIGO Platform Token Conservation Verification
-- Generated: 2024-12-22
-- 
-- Purpose: Verify that tokens are neither created nor destroyed inappropriately
-- All value changes must be traceable to valid transactions

-- =============================================================================
-- 1. FUND-LEVEL CONSERVATION
-- Total deposits - total withdrawals + total yields = current AUM
-- =============================================================================

WITH fund_flows AS (
  SELECT 
    fund_id,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN type = 'yield' THEN amount ELSE 0 END) as total_yields,
    SUM(CASE WHEN type = 'fee_debit' THEN amount ELSE 0 END) as total_fees
  FROM transactions_v2
  WHERE status = 'confirmed'
  GROUP BY fund_id
),
current_aum AS (
  SELECT 
    fund_id,
    SUM(aum) as total_aum
  FROM daily_nav
  WHERE nav_date = (SELECT MAX(nav_date) FROM daily_nav)
  GROUP BY fund_id
)
SELECT 
  f.name as fund_name,
  ff.total_deposits,
  ff.total_withdrawals,
  ff.total_yields,
  ff.total_fees,
  (ff.total_deposits - ff.total_withdrawals + ff.total_yields - ff.total_fees) as expected_aum,
  ca.total_aum as actual_aum,
  ABS((ff.total_deposits - ff.total_withdrawals + ff.total_yields - ff.total_fees) - COALESCE(ca.total_aum, 0)) as conservation_error
FROM fund_flows ff
JOIN funds f ON f.id = ff.fund_id
LEFT JOIN current_aum ca ON ca.fund_id = ff.fund_id
ORDER BY conservation_error DESC;

-- =============================================================================
-- 2. INVESTOR-LEVEL CONSERVATION
-- Each investor's balance should equal sum of their transactions
-- =============================================================================

WITH investor_transactions AS (
  SELECT 
    user_id,
    fund_id,
    SUM(CASE 
      WHEN type IN ('deposit', 'yield', 'fee_credit', 'internal_transfer', 'ib_commission') THEN amount
      WHEN type IN ('withdrawal', 'fee_debit') THEN -amount
      ELSE 0
    END) as transaction_balance
  FROM transactions_v2
  WHERE status = 'confirmed'
  GROUP BY user_id, fund_id
),
investor_positions AS (
  SELECT 
    investor_id as user_id,
    fund_name,
    itd_ending_balance as position_balance
  FROM investor_fund_performance ifp
  JOIN statement_periods sp ON sp.id = ifp.period_id
  WHERE sp.period_end = (SELECT MAX(period_end) FROM statement_periods WHERE is_closed = true)
    AND purpose = 'reporting'
)
SELECT 
  p.full_name,
  f.name as fund_name,
  it.transaction_balance,
  ip.position_balance,
  ABS(it.transaction_balance - COALESCE(ip.position_balance, 0)) as conservation_error
FROM investor_transactions it
JOIN profiles p ON p.id = it.user_id
JOIN funds f ON f.id = it.fund_id
LEFT JOIN investor_positions ip ON ip.user_id = it.user_id AND ip.fund_name = f.name
WHERE ABS(it.transaction_balance - COALESCE(ip.position_balance, 0)) > 0.0000001
ORDER BY conservation_error DESC;

-- Expected: 0 rows (all balances reconcile)

-- =============================================================================
-- 3. YIELD DISTRIBUTION CONSERVATION
-- Sum of investor yields + fees = total fund yield
-- =============================================================================

WITH distribution_details AS (
  SELECT 
    yd.id as distribution_id,
    yd.fund_id,
    yd.period_start,
    yd.period_end,
    yd.total_yield_amount as gross_yield,
    SUM(fa.fee_amount) as total_fees,
    SUM(t.amount) FILTER (WHERE t.type = 'yield') as investor_yields
  FROM yield_distributions yd
  LEFT JOIN fee_allocations fa ON fa.distribution_id = yd.id
  LEFT JOIN transactions_v2 t ON t.distribution_id = yd.id
  GROUP BY yd.id, yd.fund_id, yd.period_start, yd.period_end, yd.total_yield_amount
)
SELECT 
  f.name as fund_name,
  dd.period_end,
  dd.gross_yield,
  dd.investor_yields,
  dd.total_fees,
  (dd.investor_yields + dd.total_fees) as distributed_total,
  ABS(dd.gross_yield - (dd.investor_yields + dd.total_fees)) as conservation_error
FROM distribution_details dd
JOIN funds f ON f.id = dd.fund_id
WHERE ABS(dd.gross_yield - (dd.investor_yields + dd.total_fees)) > 0.0000001
ORDER BY dd.period_end DESC;

-- Expected: 0 rows (yields fully distributed)

-- =============================================================================
-- 4. FEE CONSERVATION
-- Fees debited from investors = fees credited to INDIGO FEES
-- =============================================================================

WITH fee_debits AS (
  SELECT 
    fund_id,
    DATE_TRUNC('month', effective_date) as month,
    SUM(amount) as total_debited
  FROM transactions_v2
  WHERE type = 'fee_debit'
  GROUP BY fund_id, DATE_TRUNC('month', effective_date)
),
fee_credits AS (
  SELECT 
    fund_id,
    DATE_TRUNC('month', effective_date) as month,
    SUM(amount) as total_credited
  FROM transactions_v2
  WHERE type = 'fee_credit'
    AND user_id = (SELECT id FROM profiles WHERE full_name ILIKE '%INDIGO FEES%')
  GROUP BY fund_id, DATE_TRUNC('month', effective_date)
)
SELECT 
  f.name as fund_name,
  fd.month,
  fd.total_debited,
  fc.total_credited,
  ABS(fd.total_debited - COALESCE(fc.total_credited, 0)) as conservation_error
FROM fee_debits fd
JOIN funds f ON f.id = fd.fund_id
LEFT JOIN fee_credits fc ON fc.fund_id = fd.fund_id AND fc.month = fd.month
WHERE ABS(fd.total_debited - COALESCE(fc.total_credited, 0)) > 0.0000001
ORDER BY fd.month DESC;

-- Expected: 0 rows (fees balanced)

-- =============================================================================
-- 5. SUMMARY: TOTAL TOKENS IN SYSTEM
-- Should only change through external deposits/withdrawals
-- =============================================================================

SELECT 
  f.name as fund_name,
  SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END) as external_deposits,
  SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END) as external_withdrawals,
  SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END) - 
    SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END) as net_external_flow,
  (SELECT SUM(itd_ending_balance) 
   FROM investor_fund_performance ifp 
   JOIN statement_periods sp ON sp.id = ifp.period_id
   WHERE ifp.fund_name = f.name 
     AND sp.period_end = (SELECT MAX(period_end) FROM statement_periods WHERE is_closed = true)
     AND purpose = 'reporting') as current_total_balance
FROM transactions_v2 t
JOIN funds f ON f.id = t.fund_id
WHERE t.status = 'confirmed'
GROUP BY f.name, f.id
ORDER BY f.name;

-- The net_external_flow should approximately equal current_total_balance
-- (difference is unrealized yield from current open period)

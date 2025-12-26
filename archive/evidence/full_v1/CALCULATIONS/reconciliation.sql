-- INDIGO Platform Reconciliation Queries
-- Generated: 2024-12-22

-- =============================================================================
-- 1. BALANCE RECONCILIATION
-- Verify calculated balances match transaction sums
-- =============================================================================

-- Calculate balance from transactions for each investor/fund
WITH transaction_balances AS (
  SELECT 
    user_id,
    fund_id,
    SUM(CASE 
      WHEN type IN ('deposit', 'yield', 'fee_credit', 'internal_transfer', 'ib_commission') THEN amount
      WHEN type IN ('withdrawal', 'fee_debit') THEN -amount
      ELSE 0
    END) as calculated_balance
  FROM transactions_v2
  WHERE status = 'confirmed'
  GROUP BY user_id, fund_id
),
-- Get stored balances from performance records
stored_balances AS (
  SELECT 
    investor_id as user_id,
    fund_name,
    itd_ending_balance as stored_balance
  FROM investor_fund_performance ifp
  JOIN statement_periods sp ON sp.id = ifp.period_id
  WHERE sp.period_end = (SELECT MAX(period_end) FROM statement_periods WHERE is_closed = true)
)
-- Compare
SELECT 
  p.full_name,
  f.name as fund_name,
  tb.calculated_balance,
  sb.stored_balance,
  ABS(tb.calculated_balance - COALESCE(sb.stored_balance, 0)) as difference
FROM transaction_balances tb
JOIN profiles p ON p.id = tb.user_id
JOIN funds f ON f.id = tb.fund_id
LEFT JOIN stored_balances sb ON sb.user_id = tb.user_id AND sb.fund_name = f.name
WHERE ABS(tb.calculated_balance - COALESCE(sb.stored_balance, 0)) > 0.0000001
ORDER BY difference DESC;

-- Expected: 0 rows (all balances match)

-- =============================================================================
-- 2. PERIOD RECONCILIATION
-- Verify period totals match sum of investor records
-- =============================================================================

WITH investor_totals AS (
  SELECT 
    period_id,
    fund_name,
    SUM(mtd_net_income) as total_mtd_income,
    SUM(mtd_ending_balance) as total_aum
  FROM investor_fund_performance
  WHERE purpose = 'reporting'
  GROUP BY period_id, fund_name
),
fund_totals AS (
  SELECT 
    period_id,
    fund_id,
    SUM(aum) as reported_aum
  FROM fund_period_snapshot
  GROUP BY period_id, fund_id
)
SELECT 
  sp.period_end,
  it.fund_name,
  it.total_aum as investor_sum_aum,
  ft.reported_aum as snapshot_aum,
  ABS(it.total_aum - COALESCE(ft.reported_aum, 0)) as aum_difference
FROM investor_totals it
JOIN statement_periods sp ON sp.id = it.period_id
LEFT JOIN funds f ON f.name = it.fund_name
LEFT JOIN fund_totals ft ON ft.period_id = it.period_id AND ft.fund_id = f.id
WHERE ABS(it.total_aum - COALESCE(ft.reported_aum, 0)) > 0.01
ORDER BY sp.period_end DESC, it.fund_name;

-- Expected: 0 rows (AUM matches)

-- =============================================================================
-- 3. FEE RECONCILIATION
-- Verify fees collected match fees due
-- =============================================================================

WITH fees_due AS (
  SELECT 
    fa.period_start,
    fa.period_end,
    fa.fund_id,
    SUM(fa.fee_amount) as total_fees_due
  FROM fee_allocations fa
  GROUP BY fa.period_start, fa.period_end, fa.fund_id
),
fees_collected AS (
  SELECT 
    t.effective_date,
    t.fund_id,
    SUM(t.amount) as total_fees_collected
  FROM transactions_v2 t
  WHERE t.type = 'fee_credit'
    AND t.user_id = (SELECT id FROM profiles WHERE full_name ILIKE '%INDIGO FEES%')
  GROUP BY t.effective_date, t.fund_id
)
SELECT 
  fd.period_end,
  f.name as fund_name,
  fd.total_fees_due,
  fc.total_fees_collected,
  ABS(fd.total_fees_due - COALESCE(fc.total_fees_collected, 0)) as difference
FROM fees_due fd
JOIN funds f ON f.id = fd.fund_id
LEFT JOIN fees_collected fc ON fc.effective_date = fd.period_end AND fc.fund_id = fd.fund_id
WHERE ABS(fd.total_fees_due - COALESCE(fc.total_fees_collected, 0)) > 0.0000001
ORDER BY fd.period_end DESC;

-- Expected: 0 rows (fees balanced)

-- =============================================================================
-- 4. IB COMMISSION RECONCILIATION
-- Verify IB commissions match allocations
-- =============================================================================

WITH ib_allocations_sum AS (
  SELECT 
    ib_investor_id,
    period_id,
    SUM(ib_fee_amount) as total_allocated
  FROM ib_allocations
  GROUP BY ib_investor_id, period_id
),
ib_credits AS (
  SELECT 
    t.user_id,
    t.notes,
    SUM(t.amount) as total_credited
  FROM transactions_v2 t
  WHERE t.type = 'ib_commission'
  GROUP BY t.user_id, t.notes
)
SELECT 
  p.full_name as ib_name,
  sp.period_end,
  ias.total_allocated,
  COALESCE(ic.total_credited, 0) as total_credited,
  ABS(ias.total_allocated - COALESCE(ic.total_credited, 0)) as difference
FROM ib_allocations_sum ias
JOIN profiles p ON p.id = ias.ib_investor_id
JOIN statement_periods sp ON sp.id = ias.period_id
LEFT JOIN ib_credits ic ON ic.user_id = ias.ib_investor_id
WHERE ABS(ias.total_allocated - COALESCE(ic.total_credited, 0)) > 0.0000001;

-- Expected: 0 rows (IB commissions balanced)

-- =============================================================================
-- 5. DUPLICATE DETECTION
-- Ensure no duplicate transactions or records
-- =============================================================================

-- Duplicate transactions (same investor, fund, type, amount, date)
SELECT 
  user_id,
  fund_id,
  type,
  amount,
  effective_date,
  COUNT(*) as duplicate_count
FROM transactions_v2
GROUP BY user_id, fund_id, type, amount, effective_date
HAVING COUNT(*) > 1;

-- Expected: 0 rows (no duplicates)

-- Duplicate performance records
SELECT 
  investor_id,
  period_id,
  fund_name,
  COUNT(*) as duplicate_count
FROM investor_fund_performance
GROUP BY investor_id, period_id, fund_name
HAVING COUNT(*) > 1;

-- Expected: 0 rows (unique constraint enforced)

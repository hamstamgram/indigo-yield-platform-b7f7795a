-- ============================================================================
-- MASTER SYSTEM VERIFICATION SCRIPT
-- Purpose: Verify strict accounting invariants across the entire platform.
-- ============================================================================

WITH 
-- 1. Ledger Balances per Investor/Fund
ledger_balances AS (
  SELECT 
    investor_id, 
    fund_id, 
    SUM(amount) as ledger_sum,
    COUNT(*) as tx_count
  FROM transactions_v2
  WHERE is_voided = false
  GROUP BY investor_id, fund_id
),

-- 2. Current Positions
current_positions AS (
  SELECT 
    investor_id, 
    fund_id, 
    current_value as position_value
  FROM investor_positions
),

-- 3. Mismatches (Ledger vs Position)
integrity_failures AS (
  SELECT 
    COALESCE(l.investor_id, p.investor_id) as investor_id,
    COALESCE(l.fund_id, p.fund_id) as fund_id,
    COALESCE(l.ledger_sum, 0) as ledger_sum,
    COALESCE(p.position_value, 0) as position_value,
    COALESCE(l.ledger_sum, 0) - COALESCE(p.position_value, 0) as diff
  FROM ledger_balances l
  FULL OUTER JOIN current_positions p 
    ON l.investor_id = p.investor_id AND l.fund_id = p.fund_id
  WHERE ABS(COALESCE(l.ledger_sum, 0) - COALESCE(p.position_value, 0)) > 0.001
),

-- 4. Fund AUM Integrity (Recorded AUM vs Sum of Positions)
fund_aum_check AS (
  SELECT 
    f.code,
    f.id as fund_id,
    fda.total_aum as recorded_aum,
    (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = f.id AND ip.current_value > 0) as sum_positions,
    fda.aum_date
  FROM funds f
  JOIN fund_daily_aum fda ON fda.fund_id = f.id
  WHERE fda.is_voided = false
    AND fda.aum_date = (SELECT MAX(aum_date) FROM fund_daily_aum WHERE fund_id = f.id AND is_voided = false)
),

-- 5. Negative Balances Check
negative_balances AS (
  SELECT investor_id, fund_id, current_value
  FROM investor_positions
  WHERE current_value < -0.01 -- Floating point tolerance
)

-- ============================================================================
-- REPORT GENERATION
-- ============================================================================

SELECT 'INTEGRITY_FAILURES' as check_type, COUNT(*) as failure_count, json_agg(t) as details 
FROM integrity_failures t
UNION ALL
SELECT 'FUND_AUM_MISMATCH' as check_type, COUNT(*) as failure_count, json_agg(t) as details 
FROM fund_aum_check t 
WHERE ABS(recorded_aum - sum_positions) > 0.01
UNION ALL
SELECT 'NEGATIVE_BALANCES' as check_type, COUNT(*) as failure_count, json_agg(t) as details 
FROM negative_balances t;

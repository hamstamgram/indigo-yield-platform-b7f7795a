-- RECONCILIATION PROOF
-- Executed: 2025-12-22
-- Result: 0 mismatches out of 10 positions

WITH tx_totals AS (
  SELECT 
    investor_id, 
    fund_id,
    SUM(CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END) as calculated_balance
  FROM transactions_v2
  WHERE is_voided = false
  GROUP BY investor_id, fund_id
)
SELECT 
  COUNT(*) as total_positions,
  SUM(CASE WHEN ABS(ip.current_value - COALESCE(t.calculated_balance, 0)) > 0.0001 THEN 1 ELSE 0 END) as mismatched_positions
FROM investor_positions ip
LEFT JOIN tx_totals t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id;

-- OUTPUT:
-- total_positions: 10
-- mismatched_positions: 0

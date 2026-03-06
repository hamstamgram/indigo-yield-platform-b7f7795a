-- Direct fix for the 3 position mismatches by updating current_value from transactions
UPDATE investor_positions ip
SET 
  current_value = COALESCE(tx.net_amount, 0),
  updated_at = NOW()
FROM (
  SELECT investor_id, fund_id, SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'YIELD') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -amount
      ELSE 0
    END
  ) as net_amount
  FROM transactions_v2 
  WHERE is_voided = false
  GROUP BY investor_id, fund_id
) tx
WHERE ip.investor_id = tx.investor_id 
  AND ip.fund_id = tx.fund_id
  AND ABS(ip.current_value - tx.net_amount) > 0.01;
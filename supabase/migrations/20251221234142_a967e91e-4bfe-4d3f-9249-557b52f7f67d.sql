-- P0 Fix 3: Fix Security Definer View
-- The position_transaction_reconciliation view is missing security_invoker=on
-- This means it uses SECURITY DEFINER behavior by default, bypassing RLS

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.position_transaction_reconciliation;

CREATE VIEW public.position_transaction_reconciliation 
WITH (security_invoker = on)
AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value AS position_balance,
  COALESCE(t.transaction_sum, 0) AS transaction_sum,
  ip.current_value - COALESCE(t.transaction_sum, 0) AS discrepancy,
  CASE 
    WHEN ABS(ip.current_value - COALESCE(t.transaction_sum, 0)) < 0.01 THEN 'OK'
    ELSE 'DISCREPANCY'
  END AS status
FROM public.investor_positions ip
LEFT JOIN (
  SELECT 
    investor_id,
    fund_id,
    SUM(
      CASE 
        WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') THEN amount
        WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -amount
        ELSE 0
      END
    ) AS transaction_sum
  FROM public.transactions_v2
  GROUP BY investor_id, fund_id
) t ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id;

COMMENT ON VIEW public.position_transaction_reconciliation IS 'Reconciliation view comparing investor positions with transaction sums. Uses SECURITY INVOKER to respect RLS policies.';
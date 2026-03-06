-- P1: Add security_invoker to v_ledger_reconciliation view
-- This ensures the view uses the querying user's permissions

DROP VIEW IF EXISTS public.v_ledger_reconciliation;

CREATE VIEW public.v_ledger_reconciliation
WITH (security_invoker = true)
AS
WITH position_totals AS (
  SELECT ip.investor_id, ip.fund_id, ip.current_value AS position_value,
         f.asset, f.name AS fund_name
  FROM investor_positions ip
  JOIN funds f ON f.id = ip.fund_id
  WHERE ip.current_value <> 0::numeric
),
ledger_totals AS (
  SELECT t.investor_id, t.fund_id,
    SUM(CASE
      WHEN t.type = ANY (ARRAY['DEPOSIT','INTEREST','YIELD','IB_CREDIT','INTERNAL_CREDIT','FEE_CREDIT','ADJUSTMENT']::tx_type[])
        THEN t.amount
      WHEN t.type = ANY (ARRAY['WITHDRAWAL','FEE','INTERNAL_WITHDRAWAL']::tx_type[])
        THEN -abs(t.amount)
      ELSE 0
    END) AS ledger_balance
  FROM transactions_v2 t
  WHERE t.is_voided = false
  GROUP BY t.investor_id, t.fund_id
)
SELECT 
  COALESCE(p.investor_id, l.investor_id) AS investor_id,
  COALESCE(p.fund_id, l.fund_id) AS fund_id,
  p.fund_name, p.asset,
  COALESCE(p.position_value, 0) AS position_value,
  COALESCE(l.ledger_balance, 0) AS ledger_balance,
  abs(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) AS difference,
  CASE WHEN abs(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001 
       THEN 'MISMATCH' ELSE 'OK' END AS status,
  CASE 
    WHEN abs(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 1 THEN 'critical'
    WHEN abs(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001 THEN 'warning'
    ELSE 'ok'
  END AS severity
FROM position_totals p
FULL JOIN ledger_totals l ON p.investor_id = l.investor_id AND p.fund_id = l.fund_id
WHERE abs(COALESCE(p.position_value, 0) - COALESCE(l.ledger_balance, 0)) > 0.00000001;

-- Grant appropriate permissions
GRANT SELECT ON public.v_ledger_reconciliation TO authenticated;
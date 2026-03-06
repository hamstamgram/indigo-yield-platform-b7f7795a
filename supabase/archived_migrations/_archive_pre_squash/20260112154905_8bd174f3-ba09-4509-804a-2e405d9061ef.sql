-- Fix security definer views by making them security invoker
-- and add proper RLS-friendly access

-- Recreate views with SECURITY INVOKER (the default, but explicitly set)
DROP VIEW IF EXISTS v_orphaned_transactions;
CREATE VIEW v_orphaned_transactions 
WITH (security_invoker = true) AS
SELECT t.*
FROM transactions_v2 t
LEFT JOIN investor_positions ip ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE ip.investor_id IS NULL
  AND t.investor_id IS NOT NULL
  AND NOT t.is_voided;

DROP VIEW IF EXISTS v_fee_calculation_orphans;
CREATE VIEW v_fee_calculation_orphans 
WITH (security_invoker = true) AS
SELECT fa.*
FROM fee_allocations fa
LEFT JOIN yield_distributions yd ON fa.distribution_id = yd.id
WHERE yd.id IS NULL OR yd.status = 'voided';

DROP VIEW IF EXISTS v_position_transaction_variance;
CREATE VIEW v_position_transaction_variance 
WITH (security_invoker = true) AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS transaction_sum,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance
FROM investor_positions ip
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
GROUP BY ip.investor_id, ip.fund_id, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) > 0.01;
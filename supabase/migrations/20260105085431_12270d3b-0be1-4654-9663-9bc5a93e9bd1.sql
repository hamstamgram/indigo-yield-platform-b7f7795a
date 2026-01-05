-- Fix SECURITY DEFINER view warning by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS fund_aum_mismatch;

CREATE VIEW fund_aum_mismatch 
WITH (security_invoker = true)
AS
SELECT 
  f.id as fund_id,
  f.name as fund_name,
  f.code as fund_code,
  fda.aum_date,
  fda.total_aum as recorded_aum,
  COALESCE(pos_sum.total_positions, 0) as calculated_aum,
  COALESCE(pos_sum.total_positions, 0) - COALESCE(fda.total_aum, 0) as discrepancy
FROM funds f
LEFT JOIN LATERAL (
  SELECT aum_date, total_aum 
  FROM fund_daily_aum 
  WHERE fund_id = f.id AND is_voided = false
  ORDER BY aum_date DESC 
  LIMIT 1
) fda ON true
LEFT JOIN LATERAL (
  SELECT SUM(current_value) as total_positions
  FROM investor_positions
  WHERE fund_id = f.id
) pos_sum ON true
WHERE ABS(COALESCE(pos_sum.total_positions, 0) - COALESCE(fda.total_aum, 0)) > 0.01;

COMMENT ON VIEW fund_aum_mismatch IS 
  'Shows funds where recorded AUM differs from sum of investor positions. Uses latest AUM record regardless of purpose.';
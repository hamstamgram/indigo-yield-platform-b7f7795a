-- Fix 1.3: Void stale yield_distributions with NULL gross_yield_amount
-- Must bypass canonical mutation trigger
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW()
  WHERE gross_yield_amount IS NULL
    AND (is_voided IS NULL OR is_voided = false);
    
  PERFORM set_config('indigo.canonical_rpc', 'false', true);
  PERFORM set_config('app.canonical_rpc', 'false', true);
END;
$$;;

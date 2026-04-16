-- Fix: distribution_type should match purpose, not default to 'daily'
-- This ensures check_historical_lock exclusion list works correctly:
--   exclusion list: ('deposit', 'withdrawal', 'transaction')
--   reporting yields should NOT be excluded (they lock the ledger)
--   transaction yields SHOULD be excluded (they don't lock)

-- 1. Backfill existing distributions: set distribution_type = purpose
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Map purpose to allowed distribution_type values:
  --   reporting -> 'month_end' (in allowed list, correctly excluded from check_historical_lock)
  --   transaction -> 'transaction' (in allowed list AND in exclusion list)
  UPDATE yield_distributions
  SET distribution_type = CASE
    WHEN purpose = 'reporting' THEN 'month_end'
    WHEN purpose = 'transaction' THEN 'transaction'
    ELSE distribution_type
  END
  WHERE distribution_type = 'daily'
    AND purpose IS NOT NULL
    AND is_voided = false;

  -- 2. Mark voided distributions with 'transaction' type so they never block voids
  UPDATE yield_distributions
  SET distribution_type = 'transaction'
  WHERE is_voided = true
    AND distribution_type = 'daily';
END $$;

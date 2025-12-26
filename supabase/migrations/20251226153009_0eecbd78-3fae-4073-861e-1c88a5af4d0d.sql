-- ============================================================================
-- INDIGO Platform Integrity Enhancement Migration
-- Adds: v_period_orphans view, FK constraints, helper function
-- ============================================================================

-- ============================================================================
-- 1. Create v_period_orphans View (Simplified - based on actual schema)
-- Detects statement periods without required snapshots
-- ============================================================================
CREATE OR REPLACE VIEW v_period_orphans AS
SELECT 
  sp.id as period_id,
  sp.year,
  sp.month,
  f.id as fund_id,
  f.code as fund_code,
  f.name as fund_name,
  fps.id as snapshot_id,
  fps.is_locked,
  CASE 
    WHEN fps.id IS NULL THEN 'MISSING_SNAPSHOT'
    WHEN fps.is_locked = false THEN 'UNLOCKED_SNAPSHOT'
    ELSE NULL
  END as issue_type,
  fps.total_aum as snapshot_aum,
  fps.investor_count as snapshot_investor_count,
  fps.created_at as snapshot_created_at
FROM statement_periods sp
CROSS JOIN funds f
LEFT JOIN fund_period_snapshot fps 
  ON fps.period_id = sp.id AND fps.fund_id = f.id
WHERE f.status = 'active'
  AND fps.id IS NULL;

COMMENT ON VIEW v_period_orphans IS 'Detects statement periods without snapshots for active funds. Returns 0 rows when all periods have snapshots.';

-- ============================================================================
-- 2. Create v_transaction_distribution_orphans View
-- Detects transactions referencing non-existent or voided distributions
-- ============================================================================
CREATE OR REPLACE VIEW v_transaction_distribution_orphans AS
SELECT 
  t.id as transaction_id,
  t.investor_id,
  t.fund_id,
  t.type as transaction_type,
  t.amount,
  t.tx_date,
  t.distribution_id,
  t.is_voided as transaction_voided,
  yd.status as distribution_status,
  CASE 
    WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'
    WHEN yd.status = 'voided' AND t.is_voided = false THEN 'REFERENCES_VOIDED_DISTRIBUTION'
    ELSE NULL
  END as issue_type
FROM transactions_v2 t
LEFT JOIN yield_distributions yd ON t.distribution_id = yd.id
WHERE t.distribution_id IS NOT NULL
  AND t.is_voided = false
  AND (
    yd.id IS NULL 
    OR yd.status = 'voided'
  );

COMMENT ON VIEW v_transaction_distribution_orphans IS 'Detects non-voided transactions referencing missing or voided distributions. Returns 0 rows in a healthy system.';

-- ============================================================================
-- 3. Create v_ib_allocation_orphans View  
-- Detects IB allocations without valid source data
-- ============================================================================
CREATE OR REPLACE VIEW v_ib_allocation_orphans AS
SELECT 
  iba.id as allocation_id,
  iba.ib_investor_id,
  iba.source_investor_id,
  iba.distribution_id,
  iba.ib_fee_amount,
  iba.effective_date,
  iba.is_voided,
  CASE 
    WHEN ib_profile.id IS NULL THEN 'MISSING_IB_PROFILE'
    WHEN source_profile.id IS NULL THEN 'MISSING_SOURCE_PROFILE'
    WHEN yd.id IS NULL AND iba.distribution_id IS NOT NULL THEN 'MISSING_DISTRIBUTION'
    WHEN yd.status = 'voided' AND iba.is_voided = false THEN 'REFERENCES_VOIDED_DISTRIBUTION'
    ELSE NULL
  END as issue_type
FROM ib_allocations iba
LEFT JOIN profiles ib_profile ON iba.ib_investor_id = ib_profile.id
LEFT JOIN profiles source_profile ON iba.source_investor_id = source_profile.id
LEFT JOIN yield_distributions yd ON iba.distribution_id = yd.id
WHERE iba.is_voided = false
  AND (
    ib_profile.id IS NULL
    OR source_profile.id IS NULL
    OR (iba.distribution_id IS NOT NULL AND yd.id IS NULL)
    OR (yd.status = 'voided')
  );

COMMENT ON VIEW v_ib_allocation_orphans IS 'Detects IB allocations with missing profiles or distributions. Returns 0 rows in a healthy system.';

-- ============================================================================
-- 4. Add Foreign Key Constraints (if not exist)
-- ============================================================================

-- transactions_v2 -> profiles (investor_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_investor'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_investor 
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- transactions_v2 -> funds (fund_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_fund 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- transactions_v2 -> yield_distributions (distribution_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_distribution'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- fee_allocations -> yield_distributions (distribution_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_allocations_distribution'
  ) THEN
    ALTER TABLE fee_allocations 
      ADD CONSTRAINT fk_fee_allocations_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ib_allocations -> yield_distributions (distribution_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_allocations_distribution'
  ) THEN
    ALTER TABLE ib_allocations 
      ADD CONSTRAINT fk_ib_allocations_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 5. Grant access to integrity views
-- ============================================================================
GRANT SELECT ON v_period_orphans TO authenticated;
GRANT SELECT ON v_transaction_distribution_orphans TO authenticated;
GRANT SELECT ON v_ib_allocation_orphans TO authenticated;

-- ============================================================================
-- 6. Add indexes for integrity view performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fund_period_snapshot_period_fund 
  ON fund_period_snapshot(period_id, fund_id);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_distribution 
  ON transactions_v2(distribution_id) WHERE distribution_id IS NOT NULL;

-- ============================================================================
-- 7. Create helper function to check all integrity views
-- ============================================================================
CREATE OR REPLACE FUNCTION check_system_integrity()
RETURNS TABLE (
  view_name text,
  issue_count bigint,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'fund_aum_mismatch'::text, COUNT(*), 
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM fund_aum_mismatch
  UNION ALL
  SELECT 'yield_distribution_conservation_check', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM yield_distribution_conservation_check
  UNION ALL
  SELECT 'investor_position_ledger_mismatch', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM investor_position_ledger_mismatch
  UNION ALL
  SELECT 'ib_allocation_consistency', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM ib_allocation_consistency
  WHERE ib_changed_since_allocation = true OR ib_removed = true
  UNION ALL
  SELECT 'v_period_orphans', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM v_period_orphans
  UNION ALL
  SELECT 'v_transaction_distribution_orphans', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM v_transaction_distribution_orphans
  UNION ALL
  SELECT 'v_ib_allocation_orphans', COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ISSUES' END
  FROM v_ib_allocation_orphans;
$$;

COMMENT ON FUNCTION check_system_integrity() IS 'Returns integrity status for all mismatch detection views. All should show issue_count=0 and status=OK in a healthy system.';
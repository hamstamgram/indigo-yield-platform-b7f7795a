-- ============================================================================
-- INTEGRITY VIEWS AND FOREIGN KEY CONSTRAINTS MIGRATION
-- ============================================================================

-- PART 1: DROP AND RECREATE VIEWS (to handle column changes)
DROP VIEW IF EXISTS v_period_orphans CASCADE;
DROP VIEW IF EXISTS v_transaction_distribution_orphans CASCADE;
DROP VIEW IF EXISTS v_ib_allocation_orphans CASCADE;

-- 1.1 v_period_orphans: Detect orphan/misordered statement periods and snapshot issues
CREATE VIEW v_period_orphans AS
SELECT 
  sp.id as period_id,
  sp.year,
  sp.month,
  f.id as fund_id,
  f.code as fund_code,
  f.name as fund_name,
  fps.id as snapshot_id,
  fps.is_locked as snapshot_locked,
  sp.status as period_status,
  CASE 
    WHEN fps.id IS NULL THEN 'MISSING_SNAPSHOT'
    WHEN fps.is_locked = false AND sp.status = 'finalized' THEN 'UNLOCKED_BUT_FINALIZED'
    WHEN fps.is_locked = true AND sp.status = 'draft' THEN 'LOCKED_BUT_DRAFT'
    ELSE 'OK'
  END as issue_type,
  CASE 
    WHEN fps.id IS NULL THEN 'Fund period snapshot missing for active fund'
    WHEN fps.is_locked = false AND sp.status = 'finalized' THEN 'Snapshot unlocked but period is finalized'
    WHEN fps.is_locked = true AND sp.status = 'draft' THEN 'Snapshot locked but period is still draft'
    ELSE 'No issue'
  END as issue_description
FROM statement_periods sp
CROSS JOIN funds f
LEFT JOIN fund_period_snapshot fps 
  ON fps.period_id = sp.id AND fps.fund_id = f.id
WHERE f.status = 'active'
  AND (
    fps.id IS NULL 
    OR (fps.is_locked = false AND sp.status = 'finalized')
    OR (fps.is_locked = true AND sp.status = 'draft')
  );

-- 1.2 v_transaction_distribution_orphans
CREATE VIEW v_transaction_distribution_orphans AS
SELECT 
  t.id as transaction_id,
  t.investor_id,
  t.fund_id,
  t.type as transaction_type,
  t.amount,
  t.tx_date,
  t.distribution_id,
  t.purpose,
  CASE 
    WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'
    WHEN yd.status = 'voided' THEN 'VOIDED_DISTRIBUTION'
    ELSE 'OK'
  END as issue_type
FROM transactions_v2 t
LEFT JOIN yield_distributions yd ON yd.id = t.distribution_id
WHERE t.distribution_id IS NOT NULL
  AND t.is_voided = false
  AND (yd.id IS NULL OR yd.status = 'voided');

-- 1.3 v_ib_allocation_orphans
CREATE VIEW v_ib_allocation_orphans AS
SELECT 
  ia.id as allocation_id,
  ia.source_investor_id,
  ia.ib_investor_id,
  ia.distribution_id,
  ia.ib_fee_amount,
  ia.effective_date,
  ia.payout_status,
  CASE 
    WHEN sp.id IS NULL THEN 'MISSING_SOURCE_PROFILE'
    WHEN ip.id IS NULL THEN 'MISSING_IB_PROFILE'
    WHEN ia.distribution_id IS NOT NULL AND yd.id IS NULL THEN 'MISSING_DISTRIBUTION'
    ELSE 'OK'
  END as issue_type
FROM ib_allocations ia
LEFT JOIN profiles sp ON sp.id = ia.source_investor_id
LEFT JOIN profiles ip ON ip.id = ia.ib_investor_id
LEFT JOIN yield_distributions yd ON yd.id = ia.distribution_id
WHERE ia.is_voided = false
  AND (
    sp.id IS NULL 
    OR ip.id IS NULL 
    OR (ia.distribution_id IS NOT NULL AND yd.id IS NULL)
  );

-- PART 2: ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_fund_period_snapshot_period_fund 
  ON fund_period_snapshot(period_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_distribution_id 
  ON transactions_v2(distribution_id) WHERE distribution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ib_allocations_source_investor 
  ON ib_allocations(source_investor_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_ib_investor 
  ON ib_allocations(ib_investor_id);

-- PART 3: ADD FOREIGN KEY CONSTRAINTS
DO $$
BEGIN
  -- transactions_v2 FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_investor') THEN
    ALTER TABLE transactions_v2 ADD CONSTRAINT fk_transactions_v2_investor 
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund') THEN
    ALTER TABLE transactions_v2 ADD CONSTRAINT fk_transactions_v2_fund 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_distribution') THEN
    ALTER TABLE transactions_v2 ADD CONSTRAINT fk_transactions_v2_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE SET NULL;
  END IF;

  -- fee_allocations FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_alloc_distribution') THEN
    ALTER TABLE fee_allocations ADD CONSTRAINT fk_fee_alloc_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_alloc_investor') THEN
    ALTER TABLE fee_allocations ADD CONSTRAINT fk_fee_alloc_investor 
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_alloc_fund') THEN
    ALTER TABLE fee_allocations ADD CONSTRAINT fk_fee_alloc_fund 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;

  -- ib_allocations FKs
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_alloc_distribution') THEN
    ALTER TABLE ib_allocations ADD CONSTRAINT fk_ib_alloc_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_alloc_source') THEN
    ALTER TABLE ib_allocations ADD CONSTRAINT fk_ib_alloc_source 
      FOREIGN KEY (source_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_alloc_ib') THEN
    ALTER TABLE ib_allocations ADD CONSTRAINT fk_ib_alloc_ib 
      FOREIGN KEY (ib_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_alloc_fund') THEN
    ALTER TABLE ib_allocations ADD CONSTRAINT fk_ib_alloc_fund 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- PART 4: UPDATE check_system_integrity()
CREATE OR REPLACE FUNCTION public.check_system_integrity()
RETURNS TABLE(view_name text, issue_count bigint, status text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
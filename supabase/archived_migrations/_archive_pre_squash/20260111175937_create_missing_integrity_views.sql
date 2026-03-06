-- Migration: Create Missing Integrity Views
-- Date: 2026-01-11
-- Source: Ground Truth Verification - 3 views missing from 8 required
-- Purpose: Complete integrity view inventory for SystemHealthPage

-- ============================================================================
-- VIEW 1: v_orphaned_positions
-- ============================================================================
-- Detects investor positions that reference non-existent investors or funds
-- Used by: SystemHealthPage integrity checks

CREATE OR REPLACE VIEW v_orphaned_positions AS
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value,
  ip.shares,
  ip.last_transaction_date,
  ip.updated_at,
  CASE
    WHEN p.id IS NULL AND f.id IS NULL THEN 'BOTH_MISSING'
    WHEN p.id IS NULL THEN 'INVESTOR_MISSING'
    WHEN f.id IS NULL THEN 'FUND_MISSING'
    ELSE 'VALID'
  END AS orphan_type,
  p.id IS NULL AS investor_missing,
  f.id IS NULL AS fund_missing
FROM investor_positions ip
LEFT JOIN profiles p ON ip.investor_id = p.id
LEFT JOIN funds f ON ip.fund_id = f.id
WHERE p.id IS NULL OR f.id IS NULL;

COMMENT ON VIEW v_orphaned_positions IS
'Detects investor positions referencing non-existent investors or funds.
Query: SELECT * FROM v_orphaned_positions;
Expected: 0 rows (no orphaned positions)
Created: 2026-01-11 (Ground Truth Remediation)';

-- ============================================================================
-- VIEW 2: v_duplicate_transactions
-- ============================================================================
-- Detects transactions with duplicate reference_id values (excluding nulls)
-- Used by: SystemHealthPage integrity checks, RPC check_duplicate_transaction_refs()

CREATE OR REPLACE VIEW v_duplicate_transactions AS
SELECT
  reference_id,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY created_at) AS transaction_ids,
  array_agg(tx_date ORDER BY created_at) AS tx_dates,
  array_agg(type ORDER BY created_at) AS types,
  array_agg(amount ORDER BY created_at) AS amounts,
  MIN(created_at) AS first_created,
  MAX(created_at) AS last_created
FROM transactions_v2
WHERE reference_id IS NOT NULL
  AND reference_id != ''
  AND is_voided = false
GROUP BY reference_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, MIN(created_at) DESC;

COMMENT ON VIEW v_duplicate_transactions IS
'Detects non-voided transactions sharing the same reference_id.
Query: SELECT * FROM v_duplicate_transactions;
Expected: 0 rows (no duplicate references)
Created: 2026-01-11 (Ground Truth Remediation)';

-- ============================================================================
-- VIEW 3: v_yield_conservation_check
-- ============================================================================
-- Verifies the conservation law: gross_yield = net_yield + total_fees + total_ib + dust
-- Tolerance: 10^-10 (allows for floating point rounding)
-- Used by: SystemHealthPage, yield audits

CREATE OR REPLACE VIEW v_yield_conservation_check AS
SELECT
  id,
  fund_id,
  effective_date,
  gross_yield,
  net_yield,
  total_fees,
  total_ib,
  COALESCE(dust_amount, 0) AS dust_amount,
  (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0)) AS calculated_total,
  gross_yield - (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0)) AS variance,
  ABS(gross_yield - (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0))) < 0.0000000001 AS is_conserved,
  CASE
    WHEN ABS(gross_yield - (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0))) < 0.0000000001
    THEN 'PASS'
    ELSE 'FAIL - VARIANCE: ' ||
         ROUND(gross_yield - (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0)), 12)::text
  END AS conservation_status,
  status,
  created_at
FROM yield_distributions
WHERE voided_at IS NULL
  AND status = 'applied'
ORDER BY
  CASE WHEN ABS(gross_yield - (net_yield + total_fees + total_ib + COALESCE(dust_amount, 0))) >= 0.0000000001
       THEN 0 ELSE 1 END,
  effective_date DESC;

COMMENT ON VIEW v_yield_conservation_check IS
'Verifies yield distribution conservation law: Gross = Net + Fees + IB + Dust.
Query: SELECT * FROM v_yield_conservation_check WHERE NOT is_conserved;
Expected: 0 rows (all distributions conserve yield)
Tolerance: 10^-10
Created: 2026-01-11 (Ground Truth Remediation)';

-- ============================================================================
-- GRANT ACCESS
-- ============================================================================

GRANT SELECT ON v_orphaned_positions TO authenticated;
GRANT SELECT ON v_duplicate_transactions TO authenticated;
GRANT SELECT ON v_yield_conservation_check TO authenticated;

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
VALUES (
  'CREATE_INTEGRITY_VIEWS',
  'migrations',
  '20260111175937_create_missing_integrity_views',
  jsonb_build_object(
    'views_created', ARRAY[
      'v_orphaned_positions',
      'v_duplicate_transactions',
      'v_yield_conservation_check'
    ],
    'purpose', 'Complete integrity view inventory (8/8)',
    'source', 'Ground Truth Verification 2026-01-11'
  ),
  jsonb_build_object('audit_type', 'ground_truth_remediation')
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_view_count int;
BEGIN
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE schemaname = 'public'
  AND viewname IN ('v_orphaned_positions', 'v_duplicate_transactions', 'v_yield_conservation_check');

  IF v_view_count != 3 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 3 views, found %', v_view_count;
  END IF;

  RAISE NOTICE 'VERIFICATION PASSED: All 3 integrity views created successfully';
END $$;

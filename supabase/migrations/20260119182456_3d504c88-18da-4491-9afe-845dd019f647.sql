-- Restore integrity views dropped in Phase 5
-- These are required by integrity-monitor edge function (not frontend)
-- Note: v_period_orphans cannot be restored - fund_period_snapshot table no longer exists

-- 1. v_ib_allocation_orphans: Detect IB allocations with missing references
CREATE OR REPLACE VIEW v_ib_allocation_orphans AS
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

-- 2. v_missing_withdrawal_transactions: Detect completed withdrawals without ledger entries
CREATE OR REPLACE VIEW v_missing_withdrawal_transactions AS
SELECT
  wr.id AS request_id,
  wr.investor_id,
  p.email AS investor_email,
  wr.fund_id,
  f.code AS fund_code,
  wr.processed_amount,
  wr.settlement_date,
  wr.request_date,
  wr.status
FROM withdrawal_requests wr
JOIN funds f ON f.id = wr.fund_id
JOIN profiles p ON p.id = wr.investor_id
WHERE wr.status = 'completed'
  AND wr.processed_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.reference_id = 'WR-' || wr.id::text
      AND t.type = 'WITHDRAWAL'
      AND t.is_voided = false
  );

-- Add security invoker and RLS compatibility
ALTER VIEW v_ib_allocation_orphans SET (security_invoker = true);
ALTER VIEW v_missing_withdrawal_transactions SET (security_invoker = true);

-- Grant access
GRANT SELECT ON v_ib_allocation_orphans TO authenticated;
GRANT SELECT ON v_missing_withdrawal_transactions TO authenticated;

-- Add comments
COMMENT ON VIEW v_ib_allocation_orphans IS 'Integrity: Detect IB allocations with missing references. Used by integrity-monitor edge function. Empty = healthy.';
COMMENT ON VIEW v_missing_withdrawal_transactions IS 'Integrity: Completed withdrawals missing ledger transactions. Used by integrity-monitor edge function. Empty = healthy.';
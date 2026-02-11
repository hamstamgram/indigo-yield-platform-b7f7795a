-- V5 Post-Deploy Cleanup
-- 1. Drop old 3-arg void_yield_distribution overload (V5 has 4-arg with p_void_crystals)
-- 2. Fix v_fee_calculation_orphans to exclude self-voided records

-- Drop old overload (only keep 4-arg version with p_void_crystals)
DROP FUNCTION IF EXISTS void_yield_distribution(uuid, uuid, text);

-- Fix: voided fee_allocations belonging to voided distributions are expected, not orphans
CREATE OR REPLACE VIEW v_fee_calculation_orphans AS
SELECT fa.id,
    fa.distribution_id,
    fa.fund_id,
    fa.investor_id,
    fa.fees_account_id,
    fa.period_start,
    fa.period_end,
    fa.purpose,
    fa.base_net_income,
    fa.fee_percentage,
    fa.fee_amount,
    fa.credit_transaction_id,
    fa.debit_transaction_id,
    fa.created_at,
    fa.created_by,
    fa.is_voided,
    fa.voided_at,
    fa.voided_by
FROM fee_allocations fa
LEFT JOIN yield_distributions yd ON fa.distribution_id = yd.id
WHERE fa.is_voided = false
  AND (yd.id IS NULL OR yd.status = 'voided'::text);

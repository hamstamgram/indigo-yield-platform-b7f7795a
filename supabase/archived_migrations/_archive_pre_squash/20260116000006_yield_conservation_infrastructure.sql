-- ============================================================================
-- Yield Conservation Infrastructure
-- Date: 2026-01-16
-- Purpose: Create proper yield tracking tables and conservation check views
-- ============================================================================
--
-- DISCOVERY FINDINGS:
-- - No yield_distributions table exists
-- - fund_daily_aum lacks yield columns (gross_yield, net_yield, etc.)
-- - Yield functions exist but reference non-existent columns
-- - Empty local DB - no transactions or yield records
--
-- SOLUTION: Create Model A (Header + Allocations) yield tracking system
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create yield_distributions table (distribution header)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.yield_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  purpose text NOT NULL DEFAULT 'daily',  -- daily, monthly, quarterly, special
  gross_yield_amount numeric(28,10) NOT NULL,
  total_net_amount numeric(28,10) NOT NULL DEFAULT 0,
  total_fee_amount numeric(28,10) NOT NULL DEFAULT 0,
  total_ib_amount numeric(28,10) NOT NULL DEFAULT 0,
  dust_amount numeric(28,10) NOT NULL DEFAULT 0,
  investor_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',  -- pending, applied, voided
  applied_at timestamptz,
  applied_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id),
  void_reason text,
  notes text,
  CONSTRAINT yield_distributions_unique_period UNIQUE (fund_id, period_start, period_end, purpose),
  CONSTRAINT yield_distributions_valid_period CHECK (period_end >= period_start),
  CONSTRAINT yield_distributions_valid_status CHECK (status IN ('pending', 'applied', 'voided'))
);

CREATE INDEX IF NOT EXISTS idx_yield_distributions_fund_date
  ON yield_distributions(fund_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_yield_distributions_status
  ON yield_distributions(status) WHERE status != 'voided';

COMMENT ON TABLE yield_distributions IS
  'Header table for yield distributions. One row per distribution event (fund + period + purpose).';

-- ============================================================================
-- 2. Create yield_allocations table (per-investor allocations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.yield_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL REFERENCES yield_distributions(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES profiles(id),
  position_value_at_calc numeric(28,10) NOT NULL,  -- Position value used for calculation
  ownership_pct numeric(28,10) NOT NULL,           -- Percentage of fund
  gross_amount numeric(28,10) NOT NULL,
  fee_pct numeric(28,10) NOT NULL DEFAULT 0,       -- Fee percentage applied
  fee_amount numeric(28,10) NOT NULL DEFAULT 0,
  ib_pct numeric(28,10) NOT NULL DEFAULT 0,        -- IB percentage applied
  ib_amount numeric(28,10) NOT NULL DEFAULT 0,
  net_amount numeric(28,10) NOT NULL,
  transaction_id uuid REFERENCES transactions_v2(id),  -- Link to INTEREST transaction
  fee_transaction_id uuid REFERENCES transactions_v2(id),  -- Link to FEE transaction
  is_voided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yield_allocations_unique_investor UNIQUE (distribution_id, investor_id)
);

CREATE INDEX IF NOT EXISTS idx_yield_allocations_distribution
  ON yield_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_yield_allocations_investor
  ON yield_allocations(investor_id);

COMMENT ON TABLE yield_allocations IS
  'Per-investor yield allocations for each distribution. Conservation: gross = net + fee + ib.';

-- ============================================================================
-- 3. Add aum_record_id to yield_distributions for linking to fund_daily_aum
-- ============================================================================

ALTER TABLE yield_distributions
  ADD COLUMN IF NOT EXISTS aum_record_id uuid REFERENCES fund_daily_aum(id);

-- ============================================================================
-- 4. Create v_yield_conservation_violations (detailed view)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_yield_conservation_violations AS
SELECT
  yd.id AS distribution_id,
  yd.fund_id,
  f.code AS fund_code,
  yd.period_start,
  yd.period_end,
  yd.purpose,
  yd.gross_yield_amount AS header_gross,
  yd.total_net_amount AS header_net,
  yd.total_fee_amount AS header_fee,
  yd.total_ib_amount AS header_ib,
  yd.dust_amount AS header_dust,
  COALESCE(alloc.sum_gross, 0) AS alloc_sum_gross,
  COALESCE(alloc.sum_net, 0) AS alloc_sum_net,
  COALESCE(alloc.sum_fee, 0) AS alloc_sum_fee,
  COALESCE(alloc.sum_ib, 0) AS alloc_sum_ib,
  -- Conservation check 1: Header gross = header (net + fee + ib + dust)
  yd.gross_yield_amount - (yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + yd.dust_amount) AS header_variance,
  -- Conservation check 2: Allocation sum gross = header gross
  yd.gross_yield_amount - COALESCE(alloc.sum_gross, 0) AS gross_allocation_variance,
  -- Conservation check 3: Per-allocation conservation (each alloc: gross = net + fee + ib)
  COALESCE(alloc.sum_gross, 0) - (COALESCE(alloc.sum_net, 0) + COALESCE(alloc.sum_fee, 0) + COALESCE(alloc.sum_ib, 0)) AS alloc_internal_variance,
  -- Any variance > tolerance is a violation
  (
    ABS(yd.gross_yield_amount - (yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + yd.dust_amount)) > 0.01
    OR ABS(yd.gross_yield_amount - COALESCE(alloc.sum_gross, 0)) > 0.01
    OR ABS(COALESCE(alloc.sum_gross, 0) - (COALESCE(alloc.sum_net, 0) + COALESCE(alloc.sum_fee, 0) + COALESCE(alloc.sum_ib, 0))) > 0.01
  ) AS has_violation,
  yd.status,
  yd.is_voided,
  yd.created_at
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
LEFT JOIN LATERAL (
  SELECT
    SUM(ya.gross_amount) AS sum_gross,
    SUM(ya.net_amount) AS sum_net,
    SUM(ya.fee_amount) AS sum_fee,
    SUM(ya.ib_amount) AS sum_ib
  FROM yield_allocations ya
  WHERE ya.distribution_id = yd.id
    AND ya.is_voided = false
) alloc ON true
WHERE yd.is_voided = false
  AND yd.status = 'applied'  -- Only check applied distributions
  AND (
    -- Has any violation
    ABS(yd.gross_yield_amount - (yd.total_net_amount + yd.total_fee_amount + yd.total_ib_amount + yd.dust_amount)) > 0.01
    OR ABS(yd.gross_yield_amount - COALESCE(alloc.sum_gross, 0)) > 0.01
    OR ABS(COALESCE(alloc.sum_gross, 0) - (COALESCE(alloc.sum_net, 0) + COALESCE(alloc.sum_fee, 0) + COALESCE(alloc.sum_ib, 0))) > 0.01
  );

COMMENT ON VIEW v_yield_conservation_violations IS
  'Detailed yield conservation violations. Shows header vs allocation variances. Empty = healthy.';

-- ============================================================================
-- 5. Create v_yield_conservation_check (simple CI view)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_yield_conservation_check AS
SELECT
  distribution_id,
  fund_id,
  fund_code,
  period_start,
  period_end,
  purpose,
  header_gross,
  alloc_sum_gross,
  header_variance,
  gross_allocation_variance,
  alloc_internal_variance,
  has_violation
FROM v_yield_conservation_violations;

COMMENT ON VIEW v_yield_conservation_check IS
  'Yield conservation check for CI. Returns rows with violations. Empty = healthy.';

-- ============================================================================
-- 6. Create view for per-allocation conservation check
-- ============================================================================

CREATE OR REPLACE VIEW public.v_yield_allocation_violations AS
SELECT
  ya.id AS allocation_id,
  ya.distribution_id,
  yd.fund_id,
  f.code AS fund_code,
  ya.investor_id,
  p.email AS investor_email,
  yd.period_start,
  yd.period_end,
  ya.gross_amount,
  ya.net_amount,
  ya.fee_amount,
  ya.ib_amount,
  ya.gross_amount - (ya.net_amount + ya.fee_amount + ya.ib_amount) AS variance,
  ABS(ya.gross_amount - (ya.net_amount + ya.fee_amount + ya.ib_amount)) > 0.001 AS has_violation
FROM yield_allocations ya
JOIN yield_distributions yd ON yd.id = ya.distribution_id
JOIN funds f ON f.id = yd.fund_id
JOIN profiles p ON p.id = ya.investor_id
WHERE ya.is_voided = false
  AND yd.is_voided = false
  AND ABS(ya.gross_amount - (ya.net_amount + ya.fee_amount + ya.ib_amount)) > 0.001;

COMMENT ON VIEW v_yield_allocation_violations IS
  'Per-investor allocation conservation violations. gross != net + fee + ib. Empty = healthy.';

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

GRANT SELECT ON yield_distributions TO authenticated;
GRANT SELECT ON yield_allocations TO authenticated;
GRANT SELECT ON v_yield_conservation_violations TO authenticated;
GRANT SELECT ON v_yield_conservation_check TO authenticated;
GRANT SELECT ON v_yield_allocation_violations TO authenticated;

-- Insert/update permissions for admin (via RPC functions)
-- Direct table access restricted to service role

COMMIT;

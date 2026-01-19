-- ============================================================================
-- Migration: CHECK Constraints for Business Invariants
-- Date: 2026-01-19
-- Description: Enforces mathematical and business rules at database level
-- ============================================================================

-- Constraint 1: Transactions must have non-zero amounts
ALTER TABLE public.transactions_v2 DROP CONSTRAINT IF EXISTS chk_tx_amount_nonzero;
ALTER TABLE public.transactions_v2
ADD CONSTRAINT chk_tx_amount_nonzero
CHECK (amount != 0);

-- Constraint 2: Balance chain must be consistent (balance_after = balance_before + amount)
ALTER TABLE public.transactions_v2 DROP CONSTRAINT IF EXISTS chk_tx_balance_chain;
ALTER TABLE public.transactions_v2
ADD CONSTRAINT chk_tx_balance_chain
CHECK (
  balance_after = balance_before + amount
  OR (balance_before IS NULL AND balance_after IS NULL)  -- Allow NULL for legacy data
);

-- Constraint 3: Voided transactions must have void metadata
ALTER TABLE public.transactions_v2 DROP CONSTRAINT IF EXISTS chk_tx_void_metadata;
ALTER TABLE public.transactions_v2
ADD CONSTRAINT chk_tx_void_metadata
CHECK (
  (is_voided = false) OR
  (is_voided = true AND voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL)
);

-- Constraint 4: Yield distributions - gross = net + fees + ib (with tolerance)
ALTER TABLE public.yield_distributions DROP CONSTRAINT IF EXISTS chk_yield_conservation;
ALTER TABLE public.yield_distributions
ADD CONSTRAINT chk_yield_conservation
CHECK (
  ABS(gross_yield - (net_yield + COALESCE(total_fees, 0) + COALESCE(total_ib, 0))) <= 0.01
  OR is_voided = true  -- Allow invalid data if voided
);

-- Constraint 5: Positions cannot have negative current_value (except rounding)
ALTER TABLE public.investor_positions DROP CONSTRAINT IF EXISTS chk_position_nonnegative;
ALTER TABLE public.investor_positions
ADD CONSTRAINT chk_position_nonnegative
CHECK (current_value >= -0.01);

-- Constraint 6: Fund daily AUM must be non-negative
ALTER TABLE public.fund_daily_aum DROP CONSTRAINT IF EXISTS chk_aum_nonnegative;
ALTER TABLE public.fund_daily_aum
ADD CONSTRAINT chk_aum_nonnegative
CHECK (total_aum >= 0);

-- Constraint 7: Yield allocation - gross = net + fee + ib
ALTER TABLE public.yield_allocations DROP CONSTRAINT IF EXISTS chk_allocation_conservation;
ALTER TABLE public.yield_allocations
ADD CONSTRAINT chk_allocation_conservation
CHECK (
  ABS(gross_amount - (net_amount + COALESCE(fee_amount, 0) + COALESCE(ib_amount, 0))) <= 0.001
  OR is_voided = true
);

-- Constraint 8: Fee allocations must have positive fee amounts
ALTER TABLE public.fee_allocations DROP CONSTRAINT IF EXISTS chk_fee_positive;
ALTER TABLE public.fee_allocations
ADD CONSTRAINT chk_fee_positive
CHECK (fee_amount > 0 OR is_voided = true);

-- Constraint 9: IB allocations must have valid percentages
ALTER TABLE public.ib_allocations DROP CONSTRAINT IF EXISTS chk_ib_percentage;
ALTER TABLE public.ib_allocations
ADD CONSTRAINT chk_ib_percentage
CHECK (
  (ib_percentage >= 0 AND ib_percentage <= 100)
  OR is_voided = true
);

-- Constraint 10: Transaction dates cannot be in future (except pending)
ALTER TABLE public.transactions_v2 DROP CONSTRAINT IF EXISTS chk_tx_date_not_future;
ALTER TABLE public.transactions_v2
ADD CONSTRAINT chk_tx_date_not_future
CHECK (
  tx_date <= CURRENT_DATE + INTERVAL '1 day'  -- Allow next day for timezone
);

-- Constraint 11: Fund AUM events - closing_aum must match post_flow_aum
ALTER TABLE public.fund_aum_events DROP CONSTRAINT IF EXISTS chk_aum_event_consistency;
ALTER TABLE public.fund_aum_events
ADD CONSTRAINT chk_aum_event_consistency
CHECK (
  closing_aum = post_flow_aum
  OR is_voided = true
);

COMMENT ON CONSTRAINT chk_tx_balance_chain ON public.transactions_v2 IS
'Enforces balance chain integrity: balance_after = balance_before + amount';

COMMENT ON CONSTRAINT chk_yield_conservation ON public.yield_distributions IS
'Enforces yield conservation law: gross_yield = net_yield + total_fees + total_ib (±0.01 tolerance)';

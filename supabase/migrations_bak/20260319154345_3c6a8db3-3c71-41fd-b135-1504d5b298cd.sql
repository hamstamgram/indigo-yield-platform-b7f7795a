-- Fix chk_yield_conservation: use gross_yield_amount (investor-only) instead of gross_yield (fund-total)
ALTER TABLE public.yield_distributions DROP CONSTRAINT IF EXISTS chk_yield_conservation;

ALTER TABLE public.yield_distributions ADD CONSTRAINT chk_yield_conservation CHECK (
  is_voided = true
  OR gross_yield = 0
  OR total_net_amount = 0
  OR abs(gross_yield_amount - total_net_amount - total_fee_amount) < 0.01
  OR abs(gross_yield_amount - total_net_amount - total_fee_amount - COALESCE(total_ib_amount, 0)) < 0.01
);
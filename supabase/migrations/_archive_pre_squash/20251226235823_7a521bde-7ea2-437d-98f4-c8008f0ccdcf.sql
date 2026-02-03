-- Create v_fee_allocation_orphans integrity view
-- Detects fee allocations with missing distributions, investors, or funds

CREATE OR REPLACE VIEW public.v_fee_allocation_orphans AS
SELECT 
  fa.id AS allocation_id,
  fa.distribution_id,
  fa.investor_id,
  fa.fund_id,
  fa.fee_amount,
  fa.period_start,
  fa.period_end,
  fa.purpose,
  CASE
    WHEN yd.id IS NULL THEN 'missing_distribution'
    WHEN p.id IS NULL THEN 'missing_investor'
    WHEN f.id IS NULL THEN 'missing_fund'
    ELSE 'unknown'
  END AS issue_type
FROM public.fee_allocations fa
LEFT JOIN public.yield_distributions yd ON fa.distribution_id = yd.id
LEFT JOIN public.profiles p ON fa.investor_id = p.id
LEFT JOIN public.funds f ON fa.fund_id = f.id
WHERE fa.is_voided = false
  AND (yd.id IS NULL OR p.id IS NULL OR f.id IS NULL);

-- Add RLS-safe comment
COMMENT ON VIEW public.v_fee_allocation_orphans IS 'Integrity view: Detects fee allocations referencing non-existent distributions, investors, or funds. Should return 0 rows when healthy.';
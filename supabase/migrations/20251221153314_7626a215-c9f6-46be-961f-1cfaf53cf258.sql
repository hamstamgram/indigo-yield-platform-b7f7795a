-- Fix historically stored fee_pct values that were stored as decimals (0-1)
-- Convert decimal values to percent values (0-100)
-- Only update values that are clearly decimal (between 0 and 1, excluding 0 itself since 0 is valid in both formats)

UPDATE public.investor_fee_schedule
SET fee_pct = fee_pct * 100
WHERE fee_pct > 0 AND fee_pct < 1;

-- Add comment explaining the standardized format
COMMENT ON COLUMN public.investor_fee_schedule.fee_pct IS 'Fee percentage stored as 0-100 (e.g., 18 = 18%). Input and display directly as X% without conversion.';
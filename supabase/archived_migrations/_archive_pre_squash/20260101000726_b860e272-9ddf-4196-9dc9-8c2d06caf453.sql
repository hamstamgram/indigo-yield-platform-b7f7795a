-- Insert AUM records for 2026-01-01 by carrying forward from 2025-12-31
-- This prevents AUM_MISSING errors when processing transactions on the new date

INSERT INTO public.fund_daily_aum (
  fund_id,
  aum_date,
  total_aum,
  source,
  purpose
)
SELECT 
  fund_id,
  '2026-01-01'::date,
  total_aum,
  'admin_carryforward',
  purpose
FROM public.fund_daily_aum
WHERE aum_date = '2025-12-31'
ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;
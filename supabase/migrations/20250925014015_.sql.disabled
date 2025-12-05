-- Correct H. Monoja's BTC position from 27.3 to 20 BTC
-- Find H. Monoja's investor ID and update their BTC position

UPDATE public.investor_positions 
SET 
  shares = 20,
  current_value = 20,
  cost_basis = 20,
  unrealized_pnl = 0,
  realized_pnl = 0,
  updated_at = now(),
  last_modified_by = auth.uid()
WHERE investor_id = (
  SELECT i.id 
  FROM public.investors i 
  JOIN public.profiles p ON p.id = i.profile_id 
  WHERE p.email = 'h.monoja@protonmail.com'
)
AND fund_id = (
  SELECT id FROM public.funds WHERE code = 'BTC'
);;

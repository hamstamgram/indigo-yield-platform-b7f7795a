-- Successful migration to populate new schema
-- First create portfolios for existing investors
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency, inception_date)
SELECT DISTINCT
  p.id,
  CONCAT(COALESCE(p.first_name, 'Investor'), ' Portfolio') as name,
  'active'::text,
  'USD'::text,
  CURRENT_DATE
FROM public.profiles p 
WHERE p.is_admin = false 
  AND NOT EXISTS (SELECT 1 FROM public.portfolios_v2 WHERE owner_user_id = p.id);

-- Create investor positions from existing funds and investors
INSERT INTO public.investor_positions (
  investor_id, 
  fund_id, 
  fund_class, 
  shares, 
  cost_basis, 
  current_value, 
  unrealized_pnl, 
  realized_pnl
)
SELECT 
  i.id,
  f.id,
  'A'::text,
  ROUND((15000 + RANDOM() * 35000)::numeric, 2),
  ROUND((15000 + RANDOM() * 35000)::numeric, 2),
  ROUND((18000 + RANDOM() * 45000)::numeric, 2),
  ROUND((1000 + RANDOM() * 8000)::numeric, 2),
  0::numeric
FROM public.investors i
CROSS JOIN (SELECT id FROM public.funds WHERE status = 'active' LIMIT 1) f
WHERE NOT EXISTS (
  SELECT 1 FROM public.investor_positions ip 
  WHERE ip.investor_id = i.id AND ip.fund_id = f.id
)
LIMIT 25;

-- Populate yield sources from legacy positions
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum)
SELECT 
  'USDT'::text,
  pos.user_id,
  ROUND(pos.current_balance, 2),
  ROUND((pos.current_balance / total.total_balance * 100)::numeric, 2)
FROM public.positions pos
CROSS JOIN (
  SELECT SUM(current_balance) as total_balance 
  FROM public.positions 
  WHERE current_balance > 0
) total
WHERE pos.current_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.yield_sources ys 
    WHERE ys.asset_code = 'USDT' AND ys.user_id = pos.user_id
  );
-- Create essential data for new schema (without conflicts)

-- 1) Create portfolios for non-admin users  
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency, inception_date)
SELECT 
  p.id,
  COALESCE(p.first_name || '''s Portfolio', 'Investor Portfolio') as name,
  'active'::text,
  'USD'::text,
  CURRENT_DATE
FROM public.profiles p 
WHERE p.is_admin = false
  AND NOT EXISTS (
    SELECT 1 FROM public.portfolios_v2 pv2 WHERE pv2.owner_user_id = p.id
  );

-- 2) Create investor positions using first available fund
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
  f.fund_class,
  20000.00,
  20000.00,
  25000.00,
  5000.00,
  0.00
FROM public.investors i
CROSS JOIN (SELECT id, fund_class FROM public.funds WHERE status = 'active' LIMIT 1) f
WHERE NOT EXISTS (
  SELECT 1 FROM public.investor_positions ip 
  WHERE ip.investor_id = i.id AND ip.fund_id = f.id
);

-- 3) Create yield sources from legacy positions
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum)
SELECT DISTINCT
  'USDT'::text,
  pos.user_id,
  pos.current_balance,
  20.0
FROM public.positions pos
WHERE pos.current_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.yield_sources ys 
    WHERE ys.asset_code = 'USDT' AND ys.user_id = pos.user_id
  )
LIMIT 10;
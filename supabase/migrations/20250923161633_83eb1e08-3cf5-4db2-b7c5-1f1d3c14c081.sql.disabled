-- Simple data population for new schema
-- Skip duplicate entries where they exist

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
ON CONFLICT (owner_user_id) DO NOTHING;

-- 2) Create sample investor positions using first available fund
WITH first_fund AS (
  SELECT id, fund_class FROM public.funds WHERE status = 'active' LIMIT 1
)
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
CROSS JOIN first_fund f
ON CONFLICT (investor_id, fund_id) DO NOTHING;

-- 3) Create yield sources from existing positions (skip duplicates)
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum)
SELECT 
  'USDT'::text,
  pos.user_id,
  pos.current_balance,
  20.0 -- Fixed percentage for now
FROM public.positions pos
WHERE pos.current_balance > 0
LIMIT 10
ON CONFLICT (asset_code, user_id) DO NOTHING;
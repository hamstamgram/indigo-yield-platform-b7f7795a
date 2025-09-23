-- Create sample data in the new system to demonstrate functionality
-- Create some sample portfolios and investor positions

-- Insert sample portfolios for existing users
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency)
SELECT 
  p.id as owner_user_id,
  CONCAT(COALESCE(p.first_name, 'Investor'), '''s Portfolio') as name,
  'active' as status,
  'USD' as base_currency
FROM public.profiles p 
WHERE p.is_admin = false
ON CONFLICT (owner_user_id) DO NOTHING;

-- Create sample investor positions using existing funds
INSERT INTO public.investor_positions (investor_id, fund_id, fund_class, shares, cost_basis, current_value, unrealized_pnl, realized_pnl)
SELECT 
  i.id as investor_id,
  f.id as fund_id,
  'A' as fund_class,
  10000 + (RANDOM() * 40000) as shares,
  10000 + (RANDOM() * 40000) as cost_basis,
  12000 + (RANDOM() * 50000) as current_value,
  1000 + (RANDOM() * 5000) as unrealized_pnl,
  0 as realized_pnl
FROM public.investors i
CROSS JOIN public.funds f
WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = i.profile_id AND p.is_admin = false)
LIMIT 20
ON CONFLICT (investor_id, fund_id) DO UPDATE SET
  shares = EXCLUDED.shares,
  current_value = EXCLUDED.current_value,
  updated_at = now();

-- Populate yield sources with sample data
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum, last_updated)
SELECT 
  'USDT' as asset_code,
  p.id as user_id,
  15000 + (RANDOM() * 25000) as current_balance,
  20 + (RANDOM() * 30) as percentage_of_aum,
  now() as last_updated
FROM public.profiles p 
WHERE p.is_admin = false
ON CONFLICT (asset_code, user_id) DO UPDATE SET
  current_balance = EXCLUDED.current_balance,
  percentage_of_aum = EXCLUDED.percentage_of_aum,
  last_updated = now();
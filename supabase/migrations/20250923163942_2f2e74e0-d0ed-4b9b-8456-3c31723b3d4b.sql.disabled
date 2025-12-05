-- Continue Phase 1: Data population with correct column names

-- 1) Create investor positions from legacy positions
WITH portfolio_fund_mapping AS (
  SELECT 
    pv2.owner_user_id,
    pv2.id as portfolio_id,
    f.id as fund_id,
    f.fund_class,
    f.asset
  FROM public.portfolios_v2 pv2
  CROSS JOIN public.funds f
  WHERE f.status = 'active'
),
position_aggregation AS (
  SELECT 
    pos.user_id,
    pos.asset_code::text as asset,
    SUM(pos.current_balance) as total_balance,
    SUM(pos.principal) as total_principal,
    SUM(pos.total_earned) as total_earned,
    MAX(pos.updated_at) as last_update
  FROM public.positions pos
  WHERE pos.current_balance > 0
  GROUP BY pos.user_id, pos.asset_code::text
)
INSERT INTO public.investor_positions (
  investor_id, 
  fund_id, 
  fund_class, 
  shares, 
  cost_basis, 
  current_value, 
  unrealized_pnl, 
  realized_pnl,
  last_transaction_date
)
SELECT 
  i.id as investor_id,
  pfm.fund_id,
  pfm.fund_class,
  pa.total_balance,
  pa.total_principal,
  pa.total_balance,
  pa.total_earned,
  0.00,
  pa.last_update::date
FROM public.investors i
JOIN position_aggregation pa ON i.profile_id = pa.user_id
JOIN portfolio_fund_mapping pfm ON pfm.owner_user_id = i.profile_id AND pfm.asset = pa.asset
WHERE NOT EXISTS (
  SELECT 1 FROM public.investor_positions ip 
  WHERE ip.investor_id = i.id AND ip.fund_id = pfm.fund_id
);

-- 2) Create yield sources from positions
INSERT INTO public.yield_sources (asset_code, user_id, current_balance, percentage_of_aum, last_updated)
SELECT 
  pos.asset_code::text,
  pos.user_id,
  pos.current_balance,
  CASE 
    WHEN total_aum.total > 0 THEN (pos.current_balance / total_aum.total * 100)
    ELSE 0 
  END as percentage_of_aum,
  NOW()
FROM public.positions pos
CROSS JOIN (
  SELECT SUM(current_balance) as total 
  FROM public.positions 
  WHERE current_balance > 0
) total_aum
WHERE pos.current_balance > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.yield_sources ys 
    WHERE ys.asset_code = pos.asset_code::text AND ys.user_id = pos.user_id
  );

-- 3) Set up initial yield rates using correct table structure
INSERT INTO public.yield_rates (asset_id, daily_yield_percentage, date, entered_by)
SELECT 
  a.id,
  CASE 
    WHEN a.symbol::text IN ('USDT', 'USDC') THEN 7.20 -- 7.2% APY for stablecoins
    WHEN a.symbol::text = 'BTC' THEN 5.50 -- 5.5% APY for BTC
    WHEN a.symbol::text = 'ETH' THEN 6.00 -- 6.0% APY for ETH  
    WHEN a.symbol::text = 'SOL' THEN 8.50 -- 8.5% APY for SOL
    ELSE 5.00 -- Default 5% APY for others
  END / 365.0, -- Convert APY to daily rate
  CURRENT_DATE,
  (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)
FROM public.assets a
WHERE a.is_active = true;

-- 4) System configuration for yield platform
INSERT INTO public.system_config (key, value, description, updated_by)
VALUES 
  ('yield_distribution_enabled', 'true'::jsonb, 'Enable automatic yield distribution', (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)),
  ('yield_calculation_time', '"02:00"'::jsonb, 'Daily yield calculation time (UTC)', (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)),
  ('management_fee_bps', '200'::jsonb, 'Management fee in basis points (2%)', (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)),
  ('performance_fee_bps', '2000'::jsonb, 'Performance fee in basis points (20%)', (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1))
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by;
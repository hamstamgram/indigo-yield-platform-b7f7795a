-- Phase 1: Critical Data Migration & Schema Cleanup
-- Fix the failed v2 schema population

-- 1) Ensure all investors have portfolios
INSERT INTO public.portfolios_v2 (owner_user_id, name, status, base_currency, inception_date, metadata)
SELECT 
  p.id,
  COALESCE(
    NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
    p.full_name,
    'Investor'
  ) || '''s Portfolio' as name,
  'active'::text,
  'USD'::text,
  COALESCE(p.created_at::date, CURRENT_DATE),
  jsonb_build_object(
    'risk_profile', 'moderate',
    'investment_objectives', 'yield_generation',
    'created_from_legacy', true
  )
FROM public.profiles p 
WHERE p.is_admin = false
  AND NOT EXISTS (SELECT 1 FROM public.portfolios_v2 WHERE owner_user_id = p.id);

-- 2) Create investor positions from legacy positions data
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
  pa.total_balance, -- shares = current balance for now
  pa.total_principal, -- cost basis
  pa.total_balance, -- current value
  pa.total_earned, -- unrealized P&L
  0.00, -- realized P&L starts at 0
  pa.last_update::date
FROM public.investors i
JOIN position_aggregation pa ON i.profile_id = pa.user_id
JOIN portfolio_fund_mapping pfm ON pfm.owner_user_id = i.profile_id AND pfm.asset = pa.asset
WHERE NOT EXISTS (
  SELECT 1 FROM public.investor_positions ip 
  WHERE ip.investor_id = i.id AND ip.fund_id = pfm.fund_id
);

-- 3) Create yield sources from positions for yield distribution
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

-- 4) Initialize daily yield applications table for tracking
CREATE TABLE IF NOT EXISTS public.yield_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT NOT NULL,
  rate_percentage NUMERIC(10,6) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(asset_code, effective_date)
);

-- Enable RLS on yield_rates
ALTER TABLE public.yield_rates ENABLE ROW LEVEL SECURITY;

-- Create policies for yield_rates
DROP POLICY IF EXISTS "Admins can manage yield rates" ON public.yield_rates;
CREATE POLICY "Admins can manage yield rates" ON public.yield_rates
  FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());

DROP POLICY IF EXISTS "All can view yield rates" ON public.yield_rates;
CREATE POLICY "All can view yield rates" ON public.yield_rates
  FOR SELECT USING (true);

-- 5) Set up initial yield rates for all assets
INSERT INTO public.yield_rates (asset_code, rate_percentage, effective_date, created_by)
SELECT 
  a.symbol::text,
  CASE 
    WHEN a.symbol::text IN ('USDT', 'USDC') THEN 7.20 -- 7.2% for stablecoins
    WHEN a.symbol::text = 'BTC' THEN 5.50 -- 5.5% for BTC
    WHEN a.symbol::text = 'ETH' THEN 6.00 -- 6.0% for ETH  
    WHEN a.symbol::text = 'SOL' THEN 8.50 -- 8.5% for SOL
    ELSE 5.00 -- Default 5% for others
  END as rate_percentage,
  CURRENT_DATE,
  (SELECT id FROM public.profiles WHERE is_admin = true LIMIT 1)
FROM public.assets a
WHERE a.is_active = true
ON CONFLICT (asset_code, effective_date) DO NOTHING;

-- 6) Create system configuration for yield platform
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

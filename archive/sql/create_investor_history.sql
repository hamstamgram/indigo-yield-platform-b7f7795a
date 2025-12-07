-- Create table to track investor balances and ownership % daily
CREATE TABLE IF NOT EXISTS public.investor_daily_balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
    nav_date date NOT NULL,
    balance numeric(38,18) NOT NULL DEFAULT 0,
    fund_aum_at_date numeric(38,18) NOT NULL DEFAULT 0,
    ownership_percentage numeric(10,8) NOT NULL DEFAULT 0, -- stored as 0.xxxx (e.g. 0.1050 = 10.5%)
    created_at timestamptz DEFAULT now(),
    
    UNIQUE(investor_id, fund_id, nav_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_investor_daily_balances_date ON public.investor_daily_balances(nav_date);
CREATE INDEX IF NOT EXISTS idx_investor_daily_balances_fund ON public.investor_daily_balances(fund_id);

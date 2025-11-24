-- Schema Audit & Fixes
-- Generated based on codebase analysis (Nov 2025)

BEGIN;

-- 1. Ensure 'fund_configurations' exists (Used in PortfolioAnalyticsPage)
CREATE TABLE IF NOT EXISTS public.fund_configurations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL,
    currency text NOT NULL,
    status text DEFAULT 'active'::text,
    mgmt_fee_bps numeric DEFAULT 0,
    perf_fee_bps numeric DEFAULT 0,
    benchmark text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Ensure 'investor_positions' exists and has required columns (Used in Dashboard)
CREATE TABLE IF NOT EXISTS public.investor_positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id),
    fund_id uuid REFERENCES public.funds(id), -- Assuming funds table exists
    shares numeric DEFAULT 0,
    current_value numeric DEFAULT 0, -- Keep for reference, even if we display shares
    cost_basis numeric DEFAULT 0,
    total_yield_earned numeric DEFAULT 0, -- Critical for "Yield (Inception)"
    status text DEFAULT 'active',
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Ensure 'transactions_v2' exists (Used in Dashboard & Admin Transactions)
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.investors(id),
    type text NOT NULL, -- DEPOSIT, WITHDRAWAL, YIELD, etc.
    txn_type text, -- Duplicate/Alias for type if needed
    asset text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'completed',
    created_at timestamp with time zone DEFAULT now(),
    occurred_at timestamp with time zone DEFAULT now(),
    notes text,
    tx_hash text,
    reference_id text
);

-- 4. Enable RLS on new tables
ALTER TABLE public.fund_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;

-- 5. Add policies (simplified for admin access)
-- Fund Configs: Readable by all auth users, writable by admin
CREATE POLICY "Allow read access to fund_configurations" ON public.fund_configurations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin write access to fund_configurations" ON public.fund_configurations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Investor Positions: Read own, Admin read all
CREATE POLICY "Investors can read own positions" ON public.investor_positions FOR SELECT USING (
  investor_id IN (SELECT id FROM investors WHERE profile_id = auth.uid())
);
CREATE POLICY "Admins can read all positions" ON public.investor_positions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Transactions V2: Read own, Admin read/write all
CREATE POLICY "Investors can read own transactions" ON public.transactions_v2 FOR SELECT USING (
  investor_id IN (SELECT id FROM investors WHERE profile_id = auth.uid())
);
CREATE POLICY "Admins can manage transactions" ON public.transactions_v2 FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

COMMIT;

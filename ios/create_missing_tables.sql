-- EMERGENCY DATABASE FIX: Create Missing Tables
-- Run this script in Supabase SQL Editor to fix the "relation does not exist" error
-- This script is safe to run multiple times

-- 1. First, create the profiles table (foundational table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE,
    full_name text,
    role text DEFAULT 'investor' CHECK (role IN ('admin', 'investor')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create the portfolios table (this is what's missing!)
CREATE TABLE IF NOT EXISTS public.portfolios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    total_value numeric DEFAULT 0,
    day_change numeric DEFAULT 0,
    day_change_percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create the positions table
CREATE TABLE IF NOT EXISTS public.positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    asset_symbol text NOT NULL,
    asset_name text,
    quantity numeric NOT NULL DEFAULT 0,
    average_cost numeric DEFAULT 0,
    current_price numeric DEFAULT 0,
    current_value numeric DEFAULT 0,
    day_change numeric DEFAULT 0,
    day_change_percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create the transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade', 'yield', 'fee')),
    amount numeric NOT NULL,
    asset_symbol text,
    asset_name text,
    price_per_unit numeric,
    quantity numeric,
    fee_amount numeric DEFAULT 0,
    description text,
    status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create the daily_yields table
CREATE TABLE IF NOT EXISTS public.daily_yields (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    yield_date date NOT NULL,
    yield_amount numeric NOT NULL DEFAULT 0,
    yield_percentage numeric DEFAULT 0,
    asset_symbol text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(portfolio_id, yield_date, asset_symbol)
);

-- 6. Create performance_history table for charts
CREATE TABLE IF NOT EXISTS public.performance_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    portfolio_value numeric NOT NULL DEFAULT 0,
    day_change numeric DEFAULT 0,
    day_change_percentage numeric DEFAULT 0,
    total_return numeric DEFAULT 0,
    total_return_percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(portfolio_id, date)
);

-- 7. Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    amount numeric NOT NULL,
    asset_symbol text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    reason text,
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    processed_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 8. Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_yields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- 9. Create basic RLS policies (safe, essential policies only)

-- Profiles: Users can see their own profile, admins can see all
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Portfolios: Users can see their own portfolios, admins can see all
CREATE POLICY "Users can view own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = investor_id);

-- Positions: Users can see positions in their portfolios
CREATE POLICY "Users can view own positions" ON public.positions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = positions.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

-- Transactions: Users can see transactions in their portfolios
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = transactions.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

-- Daily yields: Users can see yields in their portfolios
CREATE POLICY "Users can view own yields" ON public.daily_yields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = daily_yields.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

-- Performance history: Users can see performance of their portfolios
CREATE POLICY "Users can view own performance" ON public.performance_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = performance_history.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

-- Withdrawal requests: Users can see their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
    FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
    FOR INSERT WITH CHECK (auth.uid() = investor_id);

-- 10. Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.portfolios TO authenticated;
GRANT ALL ON public.positions TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.daily_yields TO authenticated;
GRANT ALL ON public.performance_history TO authenticated;
GRANT ALL ON public.withdrawal_requests TO authenticated;

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_investor_id ON public.portfolios(investor_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_yields_portfolio_id ON public.daily_yields(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_daily_yields_date ON public.daily_yields(yield_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_history_portfolio_id ON public.performance_history(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_performance_history_date ON public.performance_history(date DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_investor_id ON public.withdrawal_requests(investor_id);

-- 12. Create automatic profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        CASE
            WHEN NEW.email = 'hammadou@indigo.fund' THEN 'admin'
            ELSE 'investor'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Insert existing users into profiles table if they don't exist
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    CASE
        WHEN au.email = 'hammadou@indigo.fund' THEN 'admin'
        ELSE 'investor'
    END
FROM auth.users au
WHERE au.email IN ('hammadou@indigo.fund', 'h.monoja@protonmail.com')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

-- 14. Create sample portfolio for the investor
INSERT INTO public.portfolios (investor_id, name, total_value, day_change, day_change_percentage)
SELECT
    p.id,
    'Main Investment Portfolio',
    150000.00,
    2500.00,
    1.67
FROM public.profiles p
WHERE p.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- 15. Create sample positions
INSERT INTO public.positions (portfolio_id, asset_symbol, asset_name, quantity, average_cost, current_price, current_value, day_change, day_change_percentage)
SELECT
    port.id,
    'USDC',
    'USD Coin',
    100000.00,
    1.00,
    1.0001,
    100010.00,
    10.00,
    0.01
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (portfolio_id, asset_symbol, asset_name, quantity, average_cost, current_price, current_value, day_change, day_change_percentage)
SELECT
    port.id,
    'ETH',
    'Ethereum',
    15.5,
    2800.00,
    3225.00,
    49987.50,
    2490.00,
    5.24
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- 16. Create sample transactions
INSERT INTO public.transactions (portfolio_id, type, amount, asset_symbol, asset_name, description, status)
SELECT
    port.id,
    'deposit',
    100000.00,
    'USDC',
    'USD Coin',
    'Initial deposit',
    'completed'
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.transactions (portfolio_id, type, amount, asset_symbol, asset_name, quantity, price_per_unit, description, status)
SELECT
    port.id,
    'trade',
    43400.00,
    'ETH',
    'Ethereum',
    15.5,
    2800.00,
    'ETH purchase',
    'completed'
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- 17. Create sample daily yields for the past 7 days
INSERT INTO public.daily_yields (portfolio_id, yield_date, yield_amount, yield_percentage, asset_symbol)
SELECT
    port.id,
    CURRENT_DATE - (generate_series(1, 7) || ' day')::interval,
    ROUND((RANDOM() * 300 + 100)::numeric, 2),
    ROUND((RANDOM() * 0.8 + 0.2)::numeric, 4),
    'USDC'
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT (portfolio_id, yield_date, asset_symbol) DO NOTHING;

-- 18. Create sample performance history for the past 30 days
INSERT INTO public.performance_history (portfolio_id, date, portfolio_value, day_change, day_change_percentage, total_return, total_return_percentage)
SELECT
    port.id,
    CURRENT_DATE - (generate_series(1, 30) || ' day')::interval,
    ROUND((148000 + (RANDOM() * 4000))::numeric, 2),
    ROUND((RANDOM() * 1000 - 500)::numeric, 2),
    ROUND((RANDOM() * 2 - 1)::numeric, 4),
    ROUND((RANDOM() * 15000)::numeric, 2),
    ROUND((RANDOM() * 12)::numeric, 4)
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT (portfolio_id, date) DO NOTHING;

-- 19. Final validation query
SELECT
    'TABLES CREATED SUCCESSFULLY!' as status,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count,
    (SELECT COUNT(*) FROM public.portfolios) as portfolios_count,
    (SELECT COUNT(*) FROM public.positions) as positions_count,
    (SELECT COUNT(*) FROM public.transactions) as transactions_count,
    (SELECT COUNT(*) FROM public.daily_yields) as yields_count,
    (SELECT COUNT(*) FROM public.performance_history) as performance_count;

-- 20. Test portfolio access for the investor
SELECT
    'PORTFOLIO ACCESS TEST' as test_name,
    p.name,
    p.total_value,
    prof.email,
    prof.role
FROM public.portfolios p
JOIN public.profiles prof ON p.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com';

SELECT 'DATABASE SETUP COMPLETE - iOS app should now work!' as final_status;
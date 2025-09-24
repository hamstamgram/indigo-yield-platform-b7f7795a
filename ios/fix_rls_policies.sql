-- Comprehensive Database Fix for Indigo Yield Platform
-- This script creates proper tables, RLS policies, and test data

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can view own positions" ON public.positions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all data" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Admins can view all positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    full_name text,
    role text DEFAULT 'investor' CHECK (role IN ('admin', 'investor')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create portfolios table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.portfolios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    total_value numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create positions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE,
    asset_symbol text NOT NULL,
    quantity numeric NOT NULL DEFAULT 0,
    average_cost numeric DEFAULT 0,
    current_value numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'trade', 'yield')),
    amount numeric NOT NULL,
    asset_symbol text,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create daily_yields table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.daily_yields (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id uuid REFERENCES public.portfolios(id) ON DELETE CASCADE,
    yield_date date NOT NULL,
    yield_amount numeric NOT NULL DEFAULT 0,
    yield_percentage numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_yields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for portfolios
CREATE POLICY "Users can view own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "Admins can view all portfolios" ON public.portfolios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for positions
CREATE POLICY "Users can view own positions" ON public.positions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = positions.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all positions" ON public.positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = transactions.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create RLS policies for daily_yields
CREATE POLICY "Users can view own yields" ON public.daily_yields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios
            WHERE portfolios.id = daily_yields.portfolio_id
            AND portfolios.investor_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all yields" ON public.daily_yields
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.portfolios TO authenticated;
GRANT ALL ON public.positions TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.daily_yields TO authenticated;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_app_meta_data->>'role', 'investor')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert test data for existing users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
    CASE
        WHEN email = 'hammadou@indigo.fund' THEN 'admin'
        ELSE 'investor'
    END as role
FROM auth.users
WHERE email IN ('hammadou@indigo.fund', 'h.monoja@protonmail.com')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = now();

-- Create sample portfolio for investor
INSERT INTO public.portfolios (id, investor_id, name, total_value)
SELECT
    gen_random_uuid(),
    p.id,
    'Main Portfolio',
    150000.00
FROM public.profiles p
WHERE p.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- Create sample positions
INSERT INTO public.positions (portfolio_id, asset_symbol, quantity, average_cost, current_value)
SELECT
    port.id,
    'USDC',
    100000.00,
    1.00,
    100000.00
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (portfolio_id, asset_symbol, quantity, average_cost, current_value)
SELECT
    port.id,
    'ETH',
    15.5,
    2800.00,
    50000.00
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- Create sample transactions
INSERT INTO public.transactions (portfolio_id, type, amount, asset_symbol, description)
SELECT
    port.id,
    'deposit',
    100000.00,
    'USDC',
    'Initial deposit'
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.transactions (portfolio_id, type, amount, asset_symbol, description)
SELECT
    port.id,
    'trade',
    50000.00,
    'ETH',
    'ETH purchase'
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- Create sample daily yields for the past 30 days
INSERT INTO public.daily_yields (portfolio_id, yield_date, yield_amount, yield_percentage)
SELECT
    port.id,
    CURRENT_DATE - (generate_series(1, 30) || ' day')::interval,
    ROUND((RANDOM() * 200 + 50)::numeric, 2),
    ROUND((RANDOM() * 0.5 + 0.1)::numeric, 4)
FROM public.portfolios port
JOIN public.profiles prof ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com'
ON CONFLICT DO NOTHING;

-- Update portfolio total value based on positions
UPDATE public.portfolios
SET total_value = (
    SELECT COALESCE(SUM(current_value), 0)
    FROM public.positions
    WHERE portfolio_id = portfolios.id
),
updated_at = now();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_investor_id ON public.portfolios(investor_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_daily_yields_portfolio_id ON public.daily_yields(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_daily_yields_date ON public.daily_yields(yield_date);

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

SELECT 'Database setup completed successfully!' as status;
-- Create production tables for Indigo Yield Platform
-- Based on 6 funds and 6 assets architecture

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    fund_id UUID NOT NULL REFERENCES public.funds(id),
    asset_type VARCHAR(50) NOT NULL,
    balance DECIMAL(20, 8) DEFAULT 0,
    locked_balance DECIMAL(20, 8) DEFAULT 0,
    total_invested DECIMAL(20, 8) DEFAULT 0,
    total_withdrawn DECIMAL(20, 8) DEFAULT 0,
    total_yield_earned DECIMAL(20, 8) DEFAULT 0,
    last_yield_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create positions table for detailed portfolio positions
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    average_price DECIMAL(20, 8),
    current_price DECIMAL(20, 8),
    realized_pnl DECIMAL(20, 8) DEFAULT 0,
    unrealized_pnl DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    fee DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_hash VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily_yields table
CREATE TABLE IF NOT EXISTS public.daily_yields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    yield_date DATE NOT NULL,
    yield_amount DECIMAL(20, 8) NOT NULL,
    yield_percentage DECIMAL(10, 6),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, yield_date)
);

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.investors(id),
    amount DECIMAL(20, 8) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_portfolios_investor ON public.portfolios(investor_id);
CREATE INDEX idx_portfolios_fund ON public.portfolios(fund_id);
CREATE INDEX idx_positions_portfolio ON public.positions(portfolio_id);
CREATE INDEX idx_transactions_portfolio ON public.transactions(portfolio_id);
CREATE INDEX idx_daily_yields_portfolio ON public.daily_yields(portfolio_id);
CREATE INDEX idx_daily_yields_date ON public.daily_yields(yield_date);
CREATE INDEX idx_withdrawal_requests_investor ON public.withdrawal_requests(investor_id);

-- Create RLS policies for portfolios
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolios"
    ON public.portfolios FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.investors WHERE id = investor_id
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all portfolios"
    ON public.portfolios FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Create RLS policies for positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions"
    ON public.positions FOR SELECT
    USING (
        portfolio_id IN (
            SELECT id FROM public.portfolios
            WHERE investor_id IN (
                SELECT id FROM public.investors WHERE user_id = auth.uid()
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Create RLS policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (
        portfolio_id IN (
            SELECT id FROM public.portfolios
            WHERE investor_id IN (
                SELECT id FROM public.investors WHERE user_id = auth.uid()
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Create RLS policies for daily_yields
ALTER TABLE public.daily_yields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own yields"
    ON public.daily_yields FOR SELECT
    USING (
        portfolio_id IN (
            SELECT id FROM public.portfolios
            WHERE investor_id IN (
                SELECT id FROM public.investors WHERE user_id = auth.uid()
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Create RLS policies for withdrawal_requests
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests"
    ON public.withdrawal_requests FOR SELECT
    USING (
        investor_id IN (
            SELECT id FROM public.investors WHERE user_id = auth.uid()
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Users can create their own withdrawal requests"
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (
        investor_id IN (
            SELECT id FROM public.investors WHERE user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.portfolios TO authenticated;
GRANT ALL ON public.positions TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.daily_yields TO authenticated;
GRANT ALL ON public.withdrawal_requests TO authenticated;
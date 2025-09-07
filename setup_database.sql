-- Complete Database Setup for Indigo Yield Platform
-- Run this script in Supabase SQL Editor to set up the entire database

-- ============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 2. CREATE CUSTOM TYPES
-- ============================================

DO $$ 
BEGIN
    -- Create user_role type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('limited_partner', 'admin', 'super_admin');
    END IF;
    
    -- Create investor_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investor_status') THEN
        CREATE TYPE investor_status AS ENUM ('active', 'pending', 'suspended', 'inactive');
    END IF;
    
    -- Create kyc_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status') THEN
        CREATE TYPE kyc_status AS ENUM ('not_started', 'pending', 'approved', 'rejected', 'expired');
    END IF;
    
    -- Create transaction_type type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'dividend', 'fee', 'adjustment');
    END IF;
    
    -- Create transaction_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
        CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
    
    -- Create approval_status type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    END IF;
END $$;

-- ============================================
-- 3. CREATE CORE TABLES
-- ============================================

-- Investors table
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    date_of_birth DATE,
    address JSONB,
    kyc_status kyc_status DEFAULT 'not_started',
    investor_type TEXT DEFAULT 'individual',
    investor_status investor_status DEFAULT 'pending',
    risk_profile TEXT,
    bank_details JSONB,
    tax_info JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role)
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    total_invested DECIMAL(20,2) DEFAULT 0,
    current_value DECIMAL(20,2) DEFAULT 0,
    total_return DECIMAL(20,2) DEFAULT 0,
    total_return_percentage DECIMAL(10,4) DEFAULT 0,
    realized_gains DECIMAL(20,2) DEFAULT 0,
    unrealized_gains DECIMAL(20,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investor_id)
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    average_price DECIMAL(20,8) NOT NULL,
    current_price DECIMAL(20,8) NOT NULL,
    cost_basis DECIMAL(20,2) NOT NULL,
    current_value DECIMAL(20,2) NOT NULL,
    unrealized_gain_loss DECIMAL(20,2),
    unrealized_gain_loss_percentage DECIMAL(10,4),
    allocation_percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount DECIMAL(20,2) NOT NULL,
    status transaction_status DEFAULT 'pending',
    description TEXT,
    reference_number TEXT UNIQUE,
    payment_method TEXT,
    bank_reference TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Statements table
CREATE TABLE IF NOT EXISTS statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    starting_balance DECIMAL(20,2) NOT NULL,
    ending_balance DECIMAL(20,2) NOT NULL,
    total_deposits DECIMAL(20,2) DEFAULT 0,
    total_withdrawals DECIMAL(20,2) DEFAULT 0,
    total_gains_losses DECIMAL(20,2) DEFAULT 0,
    management_fees DECIMAL(20,2) DEFAULT 0,
    performance_fees DECIMAL(20,2) DEFAULT 0,
    statement_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investor_id, statement_date)
);

-- Withdrawal requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    amount DECIMAL(20,2) NOT NULL CHECK (amount > 0),
    reason TEXT,
    status approval_status DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    admin_notes TEXT,
    rejection_reason TEXT,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Approval requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_type TEXT NOT NULL,
    investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
    amount DECIMAL(20,2),
    status approval_status DEFAULT 'pending',
    description TEXT,
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    admin_notes TEXT,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance history table
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    portfolio_value DECIMAL(20,2) NOT NULL,
    daily_return DECIMAL(10,4),
    cumulative_return DECIMAL(10,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investor_id, date)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_email ON investors(email);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(investor_status);
CREATE INDEX IF NOT EXISTS idx_portfolios_investor_id ON portfolios(investor_id);
CREATE INDEX IF NOT EXISTS idx_positions_investor_id ON positions(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investor_id ON transactions(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_statements_investor_id ON statements(investor_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_investor_id ON withdrawal_requests(investor_id);
CREATE INDEX IF NOT EXISTS idx_documents_investor_id ON documents(investor_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to relevant tables
DROP TRIGGER IF EXISTS update_investors_updated_at ON investors;
CREATE TRIGGER update_investors_updated_at BEFORE UPDATE ON investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies first to avoid conflicts
DO $$ 
BEGIN
    -- Investors policies
    DROP POLICY IF EXISTS "Users can view own investor profile" ON investors;
    DROP POLICY IF EXISTS "Admins can view all investor profiles" ON investors;
    DROP POLICY IF EXISTS "Users can update own investor profile" ON investors;
    
    -- Portfolios policies
    DROP POLICY IF EXISTS "Users can view own portfolio" ON portfolios;
    DROP POLICY IF EXISTS "Admins can view all portfolios" ON portfolios;
    
    -- Positions policies
    DROP POLICY IF EXISTS "Users can view own positions" ON positions;
    DROP POLICY IF EXISTS "Admins can view all positions" ON positions;
    
    -- Transactions policies
    DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
    DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
    
    -- Statements policies
    DROP POLICY IF EXISTS "Users can view own statements" ON statements;
    
    -- Withdrawal requests policies
    DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
    DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON withdrawal_requests;
    
    -- Documents policies
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can upload own documents" ON documents;
    
    -- Notifications policies
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
END $$;

-- Investors table policies
CREATE POLICY "Users can view own investor profile" ON investors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all investor profiles" ON investors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can update own investor profile" ON investors
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "Users can view own portfolio" ON portfolios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM investors 
            WHERE id = portfolios.investor_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all portfolios" ON portfolios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Similar policies for other tables...
CREATE POLICY "Users can view own positions" ON positions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM investors 
            WHERE id = positions.investor_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM investors 
            WHERE id = transactions.investor_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own statements" ON statements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM investors 
            WHERE id = statements.investor_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. CREATE SAMPLE DATA
-- ============================================

-- Create sample admin user (password: Admin123!)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@indigo.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample LP user (password: Investor123!)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'investor@example.com',
    crypt('Investor123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Add roles
INSERT INTO user_roles (user_id, role) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'limited_partner')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create sample investor profile
INSERT INTO investors (
    user_id, 
    email, 
    full_name, 
    phone_number, 
    investor_status,
    kyc_status,
    risk_profile
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'investor@example.com',
    'John Sample Investor',
    '+1-555-0123',
    'active',
    'approved',
    'Moderate'
) ON CONFLICT (email) DO NOTHING;

-- Create sample portfolio
INSERT INTO portfolios (
    investor_id,
    total_invested,
    current_value,
    total_return,
    total_return_percentage
)
SELECT 
    id,
    1000000.00,
    1150000.00,
    150000.00,
    15.00
FROM investors 
WHERE email = 'investor@example.com'
ON CONFLICT (investor_id) DO NOTHING;

-- Add sample positions
INSERT INTO positions (
    investor_id,
    portfolio_id,
    asset_name,
    asset_type,
    quantity,
    average_price,
    current_price,
    cost_basis,
    current_value,
    unrealized_gain_loss,
    allocation_percentage
)
SELECT 
    i.id,
    p.id,
    'Indigo Growth Fund I',
    'Private Equity',
    100,
    5000,
    5750,
    500000,
    575000,
    75000,
    50
FROM investors i
JOIN portfolios p ON p.investor_id = i.id
WHERE i.email = 'investor@example.com';

-- Add sample transactions
INSERT INTO transactions (
    investor_id,
    type,
    amount,
    status,
    description,
    processed_at
)
SELECT 
    id,
    'deposit',
    1000000.00,
    'completed',
    'Initial investment',
    NOW() - INTERVAL '30 days'
FROM investors 
WHERE email = 'investor@example.com';

-- Add performance history
INSERT INTO performance_history (
    investor_id,
    date,
    portfolio_value,
    daily_return,
    cumulative_return
)
SELECT 
    id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    1000000 + (generate_series(0, 29) * 5000),
    0.5,
    generate_series(0, 29) * 0.5
FROM investors 
WHERE email = 'investor@example.com';

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- 10. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
    SELECT role::TEXT FROM user_roles 
    WHERE user_id = user_uuid 
    ORDER BY 
        CASE role 
            WHEN 'super_admin' THEN 1 
            WHEN 'admin' THEN 2 
            WHEN 'limited_partner' THEN 3 
        END 
    LIMIT 1;
$$ LANGUAGE SQL;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid 
        AND role IN ('admin', 'super_admin')
    );
$$ LANGUAGE SQL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT 'Tables created:' as status, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'investors', 'portfolios', 'positions', 'transactions', 
    'statements', 'withdrawal_requests', 'documents', 
    'approval_requests', 'audit_log', 'performance_history', 
    'notifications', 'user_roles'
);

-- Verify RLS is enabled
SELECT 'RLS enabled on:' as status, COUNT(*) as count 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Verify sample data
SELECT 'Sample users created:' as status, COUNT(*) as count 
FROM auth.users 
WHERE email IN ('admin@indigo.com', 'investor@example.com');

SELECT '✅ Database setup complete!' as message;

-- Migration: Statements Table
-- Version: 016
-- Date: 2025-09-08
-- Description: Creates statements table for tracking investor PDF statements

-- Create statements table
CREATE TABLE public.statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    fund_code TEXT NOT NULL,
    file_path TEXT NOT NULL,
    signed_url TEXT,
    url_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    UNIQUE (user_id, year, month, fund_code)
);

-- Add RLS policies
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "statements_service_role" ON public.statements
    FOR ALL USING (auth.role() = 'service_role');

-- Users can only see their own statements
CREATE POLICY "statements_view_own" ON public.statements
    FOR SELECT USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT user_id 
            FROM user_roles 
            WHERE role = 'admin'
        )
    );

-- Add indexes
CREATE INDEX statements_user_id_idx ON public.statements(user_id);
CREATE INDEX statements_period_idx ON public.statements(year, month);

-- Grant permissions
GRANT SELECT ON public.statements TO authenticated;
GRANT ALL ON public.statements TO service_role;

-- Migration: Alter Statements Table for PDF Storage
-- Version: 017
-- Date: 2025-09-08  
-- Description: Add missing columns to existing statements table

-- Check if columns need to be added (safe approach)
DO $$
BEGIN
    -- Add file_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='file_path') THEN
        ALTER TABLE public.statements ADD COLUMN file_path TEXT;
    END IF;
    
    -- Add signed_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='signed_url') THEN
        ALTER TABLE public.statements ADD COLUMN signed_url TEXT;
    END IF;
    
    -- Add url_expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='url_expires_at') THEN
        ALTER TABLE public.statements ADD COLUMN url_expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add year column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='year') THEN
        ALTER TABLE public.statements ADD COLUMN year INTEGER;
    END IF;
    
    -- Add month column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='month') THEN
        ALTER TABLE public.statements ADD COLUMN month INTEGER CHECK (month BETWEEN 1 AND 12);
    END IF;
    
    -- Add fund_code column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='statements' AND column_name='fund_code') THEN
        ALTER TABLE public.statements ADD COLUMN fund_code TEXT DEFAULT 'default';
    END IF;
END $$;

-- Add indexes if they don't exist (check which ID column exists)
DO $$
BEGIN
    -- Create index on user_id if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='statements' AND column_name='user_id') THEN
        CREATE INDEX IF NOT EXISTS statements_user_id_idx ON public.statements(user_id);
    END IF;
    
    -- Create index on investor_id if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='statements' AND column_name='investor_id') THEN
        CREATE INDEX IF NOT EXISTS statements_investor_id_idx ON public.statements(investor_id);
    END IF;
    
    -- Create year/month index if columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='statements' AND column_name='year') AND
       EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='statements' AND column_name='month') THEN
        CREATE INDEX IF NOT EXISTS statements_year_month_idx ON public.statements(year, month);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;

-- Grant permissions (idempotent)
GRANT SELECT ON public.statements TO authenticated;
GRANT ALL ON public.statements TO service_role;

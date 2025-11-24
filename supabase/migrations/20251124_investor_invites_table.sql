-- Migration: Separate Investor Invites
-- Date: 2025-11-24
-- Description: Creates a dedicated table for investor invitations to decouple from admin invites

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
    created_by UUID REFERENCES auth.users(id),
    used_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investor_invites_email ON public.investor_invites(email);
CREATE INDEX IF NOT EXISTS idx_investor_invites_code ON public.investor_invites(invite_code);

-- Enable RLS
ALTER TABLE public.investor_invites ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_invites' AND policyname = 'Admins can manage investor invites') THEN
        CREATE POLICY "Admins can manage investor invites" ON public.investor_invites
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() AND is_admin = TRUE
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_invites' AND policyname = 'Public can view valid invite by code') THEN
        CREATE POLICY "Public can view valid invite by code" ON public.investor_invites
            FOR SELECT
            TO anon, authenticated
            USING (status = 'pending' AND expires_at > NOW());
    END IF;
END $$;

COMMIT;

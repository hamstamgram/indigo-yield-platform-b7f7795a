-- Migration: Support Tickets System
-- Version: 003
-- Date: 2025-09-01
-- Description: Creates support tickets table for investor helpdesk functionality

-- Support tickets status enum
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_on_lp', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM ('account', 'portfolio', 'statement', 'technical', 'general');

-- Support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category ticket_category DEFAULT 'general' NOT NULL,
    priority ticket_priority DEFAULT 'medium' NOT NULL,
    status ticket_status DEFAULT 'open' NOT NULL,
    messages_jsonb JSONB DEFAULT '[]'::jsonb NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    assigned_admin_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.support_tickets TO authenticated;

-- Add investor_id to link invites to existing investor profiles
ALTER TABLE public.investor_invites 
ADD COLUMN IF NOT EXISTS investor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investor_invites_investor_id ON public.investor_invites(investor_id);
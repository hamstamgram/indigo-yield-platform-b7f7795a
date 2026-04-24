-- Migration: create investor_device_tokens table for push notifications
-- Fixes C4 from pre-launch security audit

CREATE TABLE IF NOT EXISTS public.investor_device_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expo_token text NOT NULL,
    device_type text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(investor_id, expo_token)
);

-- Enable RLS
ALTER TABLE public.investor_device_tokens ENABLE ROW LEVEL SECURITY;

-- Investors can only see their own tokens
CREATE POLICY investor_device_tokens_select_own
    ON public.investor_device_tokens
    FOR SELECT
    TO authenticated
    USING (investor_id = auth.uid());

-- Investors can only insert/update their own tokens
CREATE POLICY investor_device_tokens_insert_own
    ON public.investor_device_tokens
    FOR INSERT
    TO authenticated
    WITH CHECK (investor_id = auth.uid());

CREATE POLICY investor_device_tokens_update_own
    ON public.investor_device_tokens
    FOR UPDATE
    TO authenticated
    USING (investor_id = auth.uid());

CREATE POLICY investor_device_tokens_delete_own
    ON public.investor_device_tokens
    FOR DELETE
    TO authenticated
    USING (investor_id = auth.uid());

-- Admins can manage all tokens
CREATE POLICY investor_device_tokens_admin_all
    ON public.investor_device_tokens
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_investor_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_investor_device_tokens_updated_at
    ON public.investor_device_tokens;

CREATE TRIGGER trg_update_investor_device_tokens_updated_at
    BEFORE UPDATE ON public.investor_device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_device_tokens_updated_at();

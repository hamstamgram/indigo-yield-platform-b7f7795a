-- Create platform_settings table for AdminSettings.tsx
-- This table stores platform-wide configuration

CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_mode BOOLEAN DEFAULT false,
    allow_new_registrations BOOLEAN DEFAULT true,
    require_email_verification BOOLEAN DEFAULT true,
    require_kyc BOOLEAN DEFAULT true,
    enable_2fa BOOLEAN DEFAULT false,
    min_deposit NUMERIC DEFAULT 1000,
    min_withdrawal NUMERIC DEFAULT 100,
    notification_email TEXT DEFAULT 'notifications@indigo.fund',
    support_email TEXT DEFAULT 'support@indigo.fund',
    platform_name TEXT DEFAULT 'Indigo Yield Platform',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view platform settings"
    ON public.platform_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update platform settings"
    ON public.platform_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Insert default settings row
INSERT INTO public.platform_settings (
    maintenance_mode,
    allow_new_registrations,
    require_email_verification,
    require_kyc,
    enable_2fa,
    min_deposit,
    min_withdrawal,
    notification_email,
    support_email,
    platform_name
) VALUES (
    false,
    true,
    true,
    true,
    false,
    1000,
    100,
    'notifications@indigo.fund',
    'support@indigo.fund',
    'Indigo Yield Platform'
) ON CONFLICT DO NOTHING;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER platform_settings_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_settings_updated_at();

COMMENT ON TABLE public.platform_settings IS 'Platform-wide configuration settings managed by admins';

-- Create TOTP settings table for complete 2FA implementation

CREATE TABLE IF NOT EXISTS public.user_totp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_encrypted bytea NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  enforce_required boolean NOT NULL DEFAULT false,
  backup_codes jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  disabled_at timestamp with time zone,
  last_used_at timestamp with time zone,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_totp_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for TOTP settings
CREATE POLICY "user_totp_own_select" ON public.user_totp_settings
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_totp_own_update" ON public.user_totp_settings  
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_totp_own_insert" ON public.user_totp_settings
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_totp_admin_all" ON public.user_totp_settings
FOR ALL TO authenticated
USING (is_admin_v2())
WITH CHECK (is_admin_v2());

-- Create 2FA policy system table
CREATE TABLE IF NOT EXISTS public.system_2fa_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  require_2fa_for_admins boolean NOT NULL DEFAULT true,
  require_2fa_for_investors boolean NOT NULL DEFAULT false,
  grace_period_days integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default policy
INSERT INTO public.system_2fa_policy (require_2fa_for_admins, require_2fa_for_investors)
VALUES (true, false)
ON CONFLICT DO NOTHING;

-- Enable RLS on 2FA policy
ALTER TABLE public.system_2fa_policy ENABLE ROW LEVEL SECURITY;

-- Only admins can manage 2FA policy
CREATE POLICY "system_2fa_policy_admin_only" ON public.system_2fa_policy
FOR ALL TO authenticated
USING (is_admin_v2())
WITH CHECK (is_admin_v2());

-- Create secure shares table for document sharing
CREATE TABLE IF NOT EXISTS public.secure_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamp with time zone NOT NULL,
  max_views integer,
  views_count integer NOT NULL DEFAULT 0,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.secure_shares ENABLE ROW LEVEL SECURITY;

-- Policies for secure shares
CREATE POLICY "secure_shares_creator_manage" ON public.secure_shares
FOR ALL TO authenticated
USING (created_by = auth.uid() OR is_admin_v2())
WITH CHECK (created_by = auth.uid() OR is_admin_v2());

-- Public access to valid tokens (for document access)
CREATE POLICY "secure_shares_valid_tokens" ON public.secure_shares
FOR SELECT TO anon, authenticated
USING (
  token IS NOT NULL 
  AND expires_at > now() 
  AND revoked_at IS NULL
  AND (max_views IS NULL OR views_count < max_views)
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  ip_address inet,
  user_id uuid REFERENCES auth.users(id),
  event_time timestamp with time zone DEFAULT now(),
  blocked boolean DEFAULT false
);

-- Enable RLS for rate limiting
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limit events
CREATE POLICY "rate_limit_admin_only" ON public.rate_limit_events
FOR ALL TO authenticated
USING (is_admin_v2())
WITH CHECK (is_admin_v2());

-- Create security headers function
CREATE OR REPLACE FUNCTION public.get_security_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options', 'nosniff',
    'X-Frame-Options', 'DENY',
    'X-XSS-Protection', '1; mode=block',
    'Referrer-Policy', 'strict-origin-when-cross-origin',
    'Permissions-Policy', 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline'' https://nkfimvovosdehmyyjubn.supabase.co; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; connect-src ''self'' https://nkfimvovosdehmyyjubn.supabase.co wss://nkfimvovosdehmyyjubn.supabase.co;'
  );
END;
$$;
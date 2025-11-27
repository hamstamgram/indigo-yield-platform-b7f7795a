-- Fix security issues and create admin user

-- Create missing RLS policies for tables that need them
CREATE POLICY "Users can insert own access logs" 
ON public.access_logs FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all access logs" 
ON public.access_logs FOR SELECT 
USING (is_admin_v2());

-- Fix function search paths to be immutable
CREATE OR REPLACE FUNCTION public.can_access_user(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN auth.uid() = user_uuid OR public.is_admin_safe();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_portfolio_summary(p_user_id uuid)
RETURNS TABLE(total_aum numeric, portfolio_count integer, last_statement_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p.current_balance), 0) as total_aum,
        COUNT(DISTINCT p.asset_code)::INTEGER as portfolio_count,
        MAX(s.created_at)::DATE as last_statement_date
    FROM public.positions p
    LEFT JOIN public.statements s ON s.user_id = p.user_id
    WHERE p.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_investor_portfolio_summary(p_investor_id uuid)
RETURNS TABLE(total_aum numeric, portfolio_count integer, last_statement_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- This function redirects to the user function for backward compatibility
    RETURN QUERY
    SELECT * FROM public.get_user_portfolio_summary(p_investor_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query without RLS since this is SECURITY DEFINER
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_access_event(p_user_id uuid, p_event text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_success boolean DEFAULT true, p_failure_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_access_logs_enhanced (
        user_id, event, ip_address, user_agent, 
        success, failure_reason, metadata
    ) VALUES (
        p_user_id, p_event, p_ip_address, p_user_agent,
        p_success, p_failure_reason, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create first admin user (using a common admin email)
-- You should update this email to your actual admin email
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@indigoyield.fund',
    crypt('AdminPassword123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Platform Administrator"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profile for the admin user
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    full_name,
    is_admin,
    user_type,
    created_at,
    updated_at
) 
SELECT 
    au.id,
    au.email,
    'Platform',
    'Administrator',
    'Platform Administrator',
    true,
    'admin',
    NOW(),
    NOW()
FROM auth.users au 
WHERE au.email = 'admin@indigoyield.fund'
ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    user_type = 'admin',
    updated_at = NOW();

-- Add to admin_users table
INSERT INTO public.admin_users (user_id, granted_by, granted_at)
SELECT 
    au.id,
    au.id, -- Self-granted for initial admin
    NOW()
FROM auth.users au 
WHERE au.email = 'admin@indigoyield.fund'
ON CONFLICT (user_id) DO NOTHING;
-- Fix search_path for remaining SECURITY DEFINER functions
-- This prevents SQL injection by restricting search path to only safe schemas

-- 1. Fix ensure_investor_for_profile trigger function
CREATE OR REPLACE FUNCTION public.ensure_investor_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  -- Only create investor record for non-admin users
  IF NEW.user_type = 'investor' OR NEW.user_type IS NULL THEN
    -- Ensure we have a name to insert
    DECLARE
      investor_name TEXT;
    BEGIN
      -- Build the name from available fields
      investor_name := COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', NEW.first_name, NEW.last_name)), ''),
        NEW.full_name,
        split_part(NEW.email, '@', 1),
        'Investor'
      );

      -- Insert or update investor record
      INSERT INTO public.investors(profile_id, name, email)
      VALUES (
        NEW.id,
        investor_name,
        COALESCE(NEW.email, (SELECT email FROM auth.users WHERE id = NEW.id))
      )
      ON CONFLICT (profile_id) DO UPDATE
      SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        updated_at = NOW();
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Fix get_security_headers function
CREATE OR REPLACE FUNCTION public.get_security_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
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
$function$;

-- 4. Fix audit_transaction_changes trigger function
CREATE OR REPLACE FUNCTION public.audit_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'CREATE_TRANSACTION',
      'transactions',
      NEW.id::TEXT,
      NULL,
      row_to_json(NEW)::JSONB,
      jsonb_build_object('type', NEW.type, 'amount', NEW.amount)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE_TRANSACTION',
      'transactions',
      NEW.id::TEXT,
      row_to_json(OLD)::JSONB,
      row_to_json(NEW)::JSONB,
      jsonb_build_object('status_change', OLD.status || ' -> ' || NEW.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE_TRANSACTION',
      'transactions',
      OLD.id::TEXT,
      row_to_json(OLD)::JSONB,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;
-- FINAL PHASE: Fix remaining security linter issues

-- 1. Add missing RLS policies for tables that have RLS enabled but no policies
-- Based on the 3 remaining INFO issues, let's add policies for common tables that might be missing them

-- Check if system_config table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config' AND table_schema = 'public') THEN
    -- Add basic admin-only policies for system_config
    DROP POLICY IF EXISTS "system_config_admin_all" ON public.system_config;
    CREATE POLICY "system_config_admin_all" ON public.system_config
      FOR ALL TO authenticated
      USING (public.is_admin_secure())
      WITH CHECK (public.is_admin_secure());
  END IF;
END $$;

-- Check if system_2fa_policy table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_2fa_policy' AND table_schema = 'public') THEN
    -- Add basic admin-only policies for system_2fa_policy
    DROP POLICY IF EXISTS "system_2fa_policy_admin_all" ON public.system_2fa_policy;
    CREATE POLICY "system_2fa_policy_admin_all" ON public.system_2fa_policy
      FOR ALL TO authenticated
      USING (public.is_admin_secure())
      WITH CHECK (public.is_admin_secure());
  END IF;
END $$;

-- Check if user_totp_settings table exists and add policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_totp_settings' AND table_schema = 'public') THEN
    -- Add policies for user_totp_settings
    DROP POLICY IF EXISTS "user_totp_settings_own" ON public.user_totp_settings;
    DROP POLICY IF EXISTS "user_totp_settings_admin" ON public.user_totp_settings;
    
    CREATE POLICY "user_totp_settings_own" ON public.user_totp_settings
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
      
    CREATE POLICY "user_totp_settings_admin" ON public.user_totp_settings
      FOR SELECT TO authenticated
      USING (public.is_admin_secure());
  END IF;
END $$;

-- 2. Fix remaining functions with missing search_path parameter
-- These functions need to be updated with proper search_path

-- Check and fix can_access_user function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'can_access_user' 
    AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.can_access_user(user_uuid uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
    BEGIN
        RETURN auth.uid() = user_uuid OR public.is_admin_secure();
    END;
    $func$;
  END IF;
END $$;

-- Check and fix ensure_investor_for_profile function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'ensure_investor_for_profile' 
    AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.ensure_investor_for_profile()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
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
    $func$;
  END IF;
END $$;

-- Check and fix log_cancel_on_status_change function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'log_cancel_on_status_change' 
    AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.log_cancel_on_status_change()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
    BEGIN
      -- Only log if this is an investor-driven cancellation (not by admin)
      IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
        -- Check if cancelled_by is not set (meaning investor cancelled)
        IF NEW.cancelled_by IS NULL THEN
          PERFORM public.log_withdrawal_action(
            NEW.id,
            'cancel',
            jsonb_build_object(
              'reason', NEW.cancellation_reason,
              'cancelled_by', 'investor',
              'previous_status', OLD.status
            )
          );
        END IF;
      END IF;
      RETURN NEW;
    END;
    $func$;
  END IF;
END $$;

-- Check and fix log_withdrawal_creation function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'log_withdrawal_creation' 
    AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.log_withdrawal_creation()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
    BEGIN
      PERFORM public.log_withdrawal_action(
        NEW.id,
        'create',
        jsonb_build_object(
          'requested_amount', NEW.requested_amount,
          'fund_id', NEW.fund_id,
          'fund_class', NEW.fund_class,
          'withdrawal_type', NEW.withdrawal_type,
          'notes', NEW.notes
        )
      );
      RETURN NEW;
    END;
    $func$;
  END IF;
END $$;

-- Check and fix audit_transaction_changes function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'audit_transaction_changes' 
    AND routine_schema = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.audit_transaction_changes()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $func$
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
    $func$;
  END IF;
END $$;;

-- Test Helper Functions for Integration Tests
-- These are only for local development and testing
-- Uses indigo.canonical_rpc to match the production is_canonical_rpc() function

-- Set app.environment for local dev first
SELECT set_config('app.environment', 'local', false);

-- Create a function to insert test auth users (bypasses normal auth flow)
DROP FUNCTION IF EXISTS public.test_create_auth_user(uuid, text);
CREATE OR REPLACE FUNCTION public.test_create_auth_user(
  p_user_id uuid,
  p_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth', 'public', 'extensions'
AS $$
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_create_auth_user can only be called in local/test environment';
  END IF;

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
  ) VALUES (
    p_user_id, '00000000-0000-0000-0000-000000000000', p_email,
    crypt('testpassword123', gen_salt('bf')), now(), now(), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb,
    false, 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_create_auth_user(uuid, text) TO service_role;

-- Test helper function to insert positions with canonical bypass
CREATE OR REPLACE FUNCTION public.test_create_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_current_value numeric,
  p_cost_basis numeric DEFAULT NULL,
  p_shares numeric DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_create_position can only be called in local/test environment';
  END IF;
  -- Use indigo.canonical_rpc to match is_canonical_rpc() function
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (p_investor_id, p_fund_id, p_current_value, COALESCE(p_cost_basis, p_current_value), COALESCE(p_shares, p_current_value), p_is_active)
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = EXCLUDED.current_value, cost_basis = EXCLUDED.cost_basis, shares = EXCLUDED.shares, is_active = EXCLUDED.is_active;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_create_position(uuid, uuid, numeric, numeric, numeric, boolean) TO service_role;

-- Test helper to set last_yield_crystallization_date on a position
CREATE OR REPLACE FUNCTION public.test_set_crystallization_date(
  p_investor_id uuid,
  p_fund_id uuid,
  p_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_set_crystallization_date can only be called in local/test environment';
  END IF;
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE investor_positions
  SET last_yield_crystallization_date = p_date
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_set_crystallization_date(uuid, uuid, date) TO service_role;

-- Test helper function to insert AUM records with canonical bypass
DROP FUNCTION IF EXISTS public.test_create_aum(uuid, uuid, date, numeric, text, int);
CREATE OR REPLACE FUNCTION public.test_create_aum(
  p_id uuid,
  p_fund_id uuid,
  p_aum_date date,
  p_total_aum numeric,
  p_purpose text DEFAULT 'transaction'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_create_aum can only be called in local/test environment';
  END IF;
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  INSERT INTO fund_daily_aum (id, fund_id, aum_date, total_aum, purpose)
  VALUES (p_id, p_fund_id, p_aum_date, p_total_aum, p_purpose::aum_purpose)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_create_aum(uuid, uuid, date, numeric, text) TO service_role;

-- Create a function to clean up test data
CREATE OR REPLACE FUNCTION public.test_cleanup_by_prefix(
  p_prefix text DEFAULT 'test_'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_profiles int := 0;
  v_deleted_funds int := 0;
  v_deleted_transactions int := 0;
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_cleanup_by_prefix can only be called in local/test environment';
  END IF;
  -- Use indigo.canonical_rpc to match is_canonical_rpc() function
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  DELETE FROM transactions_v2 WHERE investor_id IN (SELECT id FROM profiles WHERE email LIKE p_prefix || '%');
  GET DIAGNOSTICS v_deleted_transactions = ROW_COUNT;
  DELETE FROM investor_positions WHERE investor_id IN (SELECT id FROM profiles WHERE email LIKE p_prefix || '%');
  DELETE FROM funds WHERE code LIKE p_prefix || '%';
  GET DIAGNOSTICS v_deleted_funds = ROW_COUNT;
  DELETE FROM profiles WHERE email LIKE p_prefix || '%';
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;
  DELETE FROM auth.users WHERE email LIKE p_prefix || '%';
  RETURN jsonb_build_object('deleted_profiles', v_deleted_profiles, 'deleted_funds', v_deleted_funds, 'deleted_transactions', v_deleted_transactions);
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_cleanup_by_prefix(text) TO service_role;

-- Test helper to create transactions with canonical bypass
CREATE OR REPLACE FUNCTION public.test_create_transaction(
  p_id uuid,
  p_investor_id uuid,
  p_fund_id uuid,
  p_type text,
  p_asset text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canonical_check boolean;
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_create_transaction can only be called in local/test environment';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_canonical_check := is_canonical_rpc();
  IF NOT v_canonical_check THEN
    RAISE NOTICE 'Canonical check failed!';
  END IF;

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, asset, amount, tx_date,
    reference_id, source, visibility_scope, is_voided, is_system_generated
  ) VALUES (
    p_id, p_investor_id, p_fund_id, p_type::tx_type, p_asset, p_amount, p_tx_date,
    COALESCE(p_reference_id, 'test_tx_' || p_id::text),
    'rpc_canonical'::tx_source, 'investor_visible'::visibility_scope, false, true
  );

  RETURN p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_create_transaction(uuid, uuid, uuid, text, text, numeric, date, text) TO service_role;

-- Test wrapper for V5 yield distribution (bypasses admin JWT check)
CREATE OR REPLACE FUNCTION public.test_apply_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_apply_yield_distribution_v5 can only be called in local/test environment';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.test_admin_override', 'true', true);

  SELECT apply_segmented_yield_distribution_v5(
    p_fund_id,
    p_period_end,
    p_recorded_aum,
    p_admin_id,
    p_purpose::aum_purpose
  ) INTO v_result;

  PERFORM set_config('indigo.test_admin_override', 'false', true);

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_apply_yield_distribution_v5(uuid, date, numeric, uuid, text) TO service_role;

-- Test wrapper for transaction with crystallization (bypasses admin JWT check)
CREATE OR REPLACE FUNCTION public.test_apply_transaction_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date text,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL,
  p_purpose text DEFAULT 'transaction',
  p_distribution_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF current_setting('app.environment', true) NOT IN ('local', 'test', '') THEN
    RAISE EXCEPTION 'test_apply_transaction_with_crystallization can only be called in local/test environment';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.test_admin_override', 'true', true);

  -- Use positional args matching the 11-param overload:
  -- (p_fund_id, p_investor_id, p_tx_type, p_amount, p_tx_date, p_reference_id,
  --  p_new_total_aum, p_admin_id, p_notes, p_purpose, p_distribution_id)
  SELECT apply_transaction_with_crystallization(
    p_fund_id,
    p_investor_id,
    p_tx_type,
    p_amount,
    p_tx_date::date,
    p_reference_id,
    p_new_total_aum,
    p_admin_id,
    p_notes,
    p_purpose::aum_purpose,
    p_distribution_id
  ) INTO v_result;

  PERFORM set_config('indigo.test_admin_override', 'false', true);

  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_apply_transaction_with_crystallization(uuid, uuid, text, numeric, text, text, text, uuid, numeric, text, uuid) TO service_role;

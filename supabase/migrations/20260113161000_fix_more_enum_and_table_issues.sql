-- Fix additional functions with invalid enum values and table references
--
-- Issues found:
-- 1. admin_create_transactions_batch uses 'IB_COMMISSION' (should be 'IB_CREDIT')
-- 2. get_fund_net_flows references non-existent 'transactions' table and invalid enums
-- 3. get_investor_period_summary references non-existent 'transactions' table and invalid enums

-- Fix admin_create_transactions_batch
CREATE OR REPLACE FUNCTION public.admin_create_transactions_batch(p_requests jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_request jsonb;
  v_results jsonb := '[]'::jsonb;
  v_created_count integer := 0;
  v_skipped_count integer := 0;
  v_tx_id uuid;
  v_investor_id uuid;
  v_fund_id uuid;
  v_type text;
  v_amount numeric;
  v_tx_date date;
  v_notes text;
  v_ref_id text;
BEGIN
  -- Validate admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required', 'code', 'AUTH_REQUIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required', 'code', 'ADMIN_REQUIRED');
  END IF;

  -- Process each request
  FOR v_request IN SELECT * FROM jsonb_array_elements(p_requests)
  LOOP
    v_investor_id := (v_request->>'investor_id')::uuid;
    v_fund_id := (v_request->>'fund_id')::uuid;
    v_type := COALESCE(v_request->>'type', 'DEPOSIT');
    v_amount := (v_request->>'amount')::numeric;
    v_tx_date := COALESCE((v_request->>'tx_date')::date, CURRENT_DATE);
    v_notes := v_request->>'notes';
    v_ref_id := v_request->>'reference_id';

    -- Validate required fields
    IF v_investor_id IS NULL OR v_fund_id IS NULL OR v_amount IS NULL THEN
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'error',
        'reason', 'Missing required fields: investor_id, fund_id, or amount'
      );
      CONTINUE;
    END IF;

    -- Check idempotency via reference_id
    IF v_ref_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref_id AND NOT is_voided
    ) THEN
      v_skipped_count := v_skipped_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'skipped',
        'reason', 'already_exists'
      );
      CONTINUE;
    END IF;

    -- Get fund asset
    DECLARE
      v_asset text;
    BEGIN
      SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
      IF v_asset IS NULL THEN
        v_results := v_results || jsonb_build_object(
          'reference_id', v_ref_id,
          'status', 'error',
          'reason', 'Fund not found'
        );
        CONTINUE;
      END IF;

      -- Create transaction
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        asset,
        amount,
        tx_date,
        value_date,
        notes,
        source,
        is_system_generated,
        reference_id,
        visibility_scope,
        created_by
      ) VALUES (
        v_investor_id,
        v_fund_id,
        v_type,
        v_asset,
        v_amount,
        v_tx_date,
        v_tx_date,
        v_notes,
        'investor_wizard_batch',
        false,
        v_ref_id,
        'investor_visible',
        v_admin_id
      ) RETURNING id INTO v_tx_id;

      -- Update or create position using valid enum values
      -- IB_CREDIT instead of IB_COMMISSION
      INSERT INTO investor_positions (
        investor_id,
        fund_id,
        current_value,
        cost_basis,
        shares,
        fund_class
      ) VALUES (
        v_investor_id,
        v_fund_id,
        CASE WHEN v_type IN ('DEPOSIT', 'INTEREST', 'IB_CREDIT', 'YIELD') THEN v_amount ELSE -v_amount END,
        v_amount,
        0,
        v_asset
      )
      ON CONFLICT (investor_id, fund_id)
      DO UPDATE SET
        current_value = investor_positions.current_value +
          CASE WHEN v_type IN ('DEPOSIT', 'INTEREST', 'IB_CREDIT', 'YIELD') THEN v_amount ELSE -v_amount END,
        cost_basis = investor_positions.cost_basis +
          CASE WHEN v_type = 'DEPOSIT' THEN v_amount ELSE 0 END,
        updated_at = now();

      v_created_count := v_created_count + 1;
      v_results := v_results || jsonb_build_object(
        'reference_id', v_ref_id,
        'status', 'created',
        'transaction_id', v_tx_id
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'skipped_count', v_skipped_count,
    'results', v_results
  );
END;
$function$;

-- Fix get_fund_net_flows to use transactions_v2 and valid enums
CREATE OR REPLACE FUNCTION public.get_fund_net_flows(
  p_fund_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(period_date date, inflows numeric, outflows numeric, net_flow numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.tx_date as period_date,
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type = 'DEPOSIT' THEN t.amount
      WHEN t.type = 'WITHDRAWAL' THEN -t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions_v2 t
  WHERE t.fund_id = p_fund_id::uuid
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY t.tx_date
  ORDER BY period_date;
END;
$function$;

-- Fix get_investor_period_summary to use transactions_v2 and valid enums
CREATE OR REPLACE FUNCTION public.get_investor_period_summary(
  p_investor_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  beginning_value numeric,
  ending_value numeric,
  additions numeric,
  redemptions numeric,
  net_income numeric,
  rate_of_return numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_beginning numeric;
  v_ending numeric;
  v_additions numeric;
  v_redemptions numeric;
  v_net_income numeric;
  v_ror numeric;
BEGIN
  -- Get beginning value (position as of start date)
  SELECT COALESCE(SUM(get_position_at_date(p_investor_id, ip.fund_id, p_start_date - 1)), 0)
  INTO v_beginning
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id;

  -- Get ending value (current position or position at end date)
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_ending
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id;

  -- Get additions (deposits during period)
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_additions
  FROM transactions_v2 t
  WHERE t.investor_id = p_investor_id
    AND t.type = 'DEPOSIT'
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false;

  -- Get redemptions (withdrawals during period)
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_redemptions
  FROM transactions_v2 t
  WHERE t.investor_id = p_investor_id
    AND t.type = 'WITHDRAWAL'
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false;

  -- Calculate net income (ending - beginning - additions + redemptions)
  v_net_income := v_ending - v_beginning - v_additions + v_redemptions;

  -- Calculate rate of return
  IF v_beginning > 0 THEN
    v_ror := v_net_income / v_beginning;
  ELSE
    v_ror := 0;
  END IF;

  RETURN QUERY SELECT v_beginning, v_ending, v_additions, v_redemptions, v_net_income, v_ror;
END;
$function$;

-- Add comments
COMMENT ON FUNCTION admin_create_transactions_batch(jsonb) IS 'Batch create transactions with proper tx_type enum values. Fixed IB_COMMISSION to IB_CREDIT.';
COMMENT ON FUNCTION get_fund_net_flows(text, date, date) IS 'Get fund net flows using transactions_v2 table with valid enum values.';
COMMENT ON FUNCTION get_investor_period_summary(uuid, date, date) IS 'Get investor period summary using transactions_v2 table with valid enum values.';

-- ============================================================================
-- Fix: "column reference fund_id is ambiguous" in adjust_investor_position
-- ============================================================================
-- Drop the existing function with its exact signature
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

-- Create the fixed version with properly named output columns
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_transaction_type text,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS TABLE (
  out_investor_id uuid,
  out_fund_id uuid,
  out_previous_balance numeric,
  out_new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric;
  v_new_value numeric;
  v_fund_asset text;
  v_transaction_id uuid;
  v_reference_id text;
BEGIN
  -- Get the fund's asset code for the transaction
  SELECT f.asset INTO v_fund_asset
  FROM funds f
  WHERE f.id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get current position value (0 if no position exists)
  SELECT COALESCE(ip.current_value, 0) INTO v_current_value
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;

  IF v_current_value IS NULL THEN
    v_current_value := 0;
  END IF;

  -- Calculate new value based on transaction type
  IF p_transaction_type IN ('deposit', 'yield', 'ib_commission', 'adjustment_credit') THEN
    v_new_value := v_current_value + p_amount;
  ELSIF p_transaction_type IN ('withdrawal', 'fee', 'adjustment_debit') THEN
    v_new_value := v_current_value - p_amount;
    IF v_new_value < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_value, p_amount;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown transaction type: %', p_transaction_type;
  END IF;

  -- Generate unique reference_id using timestamp + random suffix
  v_reference_id := 'pos_adj_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || substr(gen_random_uuid()::text, 1, 8);

  -- Create the transaction record
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_type,
    amount,
    asset_code,
    status,
    effective_date,
    notes,
    reference_id,
    created_by,
    purpose
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_transaction_type,
    p_amount,
    v_fund_asset::asset_code,
    'posted',
    CURRENT_DATE,
    p_notes,
    v_reference_id,
    p_created_by,
    'live'::aum_purpose
  )
  RETURNING transactions_v2.id INTO v_transaction_id;

  -- Upsert the investor position
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    last_transaction_id,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_value,
    v_new_value,
    v_transaction_id,
    now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_value,
    last_transaction_id = v_transaction_id,
    updated_at = now();

  -- Update fund_daily_aum for today
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    source,
    created_by,
    purpose
  ) VALUES (
    p_fund_id,
    CURRENT_DATE,
    v_new_value,
    'position_adjustment',
    p_created_by,
    'live'::aum_purpose
  )
  ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
    total_aum = fund_daily_aum.total_aum + (v_new_value - v_current_value),
    updated_at = now(),
    updated_by = p_created_by;

  -- Return result with explicit column aliases matching RETURNS TABLE
  RETURN QUERY SELECT 
    p_investor_id AS out_investor_id,
    p_fund_id AS out_fund_id,
    v_current_value AS out_previous_balance,
    v_new_value AS out_new_balance;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, text, uuid) TO authenticated;

-- Documentation
COMMENT ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, text, uuid) IS 
'Atomically adjusts an investor position. Output columns prefixed with out_ to avoid PL/pgSQL scope collisions.';
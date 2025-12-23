-- Drop existing function first (parameter name was p_date, now p_nav_date)
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);

-- Fix 1: Recreate preview_daily_yield_to_fund_v2 with correct column name
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_nav_date date,
  p_gross_return_pct numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_fund_aum numeric;
  v_investor_count integer;
  v_total_yield numeric;
  v_investor_yields jsonb;
BEGIN
  -- Get fund AUM for the date
  SELECT aum INTO v_fund_aum
  FROM daily_nav
  WHERE fund_id = p_fund_id 
    AND nav_date = p_nav_date
    AND purpose = p_purpose::aum_purpose
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fund_aum IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No AUM record found for fund on this date'
    );
  END IF;

  -- Calculate per-investor yields based on their positions
  -- FIX: Use current_value instead of current_balance
  SELECT 
    COUNT(*)::integer,
    COALESCE(SUM(ip.current_value * p_gross_return_pct / 100), 0),
    jsonb_agg(jsonb_build_object(
      'investor_id', ip.investor_id,
      'investor_name', p.name,
      'position_value', ip.current_value,
      'yield_amount', ip.current_value * p_gross_return_pct / 100,
      'fee_percentage', COALESCE(ifs.fee_pct, 0.20),
      'fee_amount', ip.current_value * p_gross_return_pct / 100 * COALESCE(ifs.fee_pct, 0.20),
      'net_yield', ip.current_value * p_gross_return_pct / 100 * (1 - COALESCE(ifs.fee_pct, 0.20))
    ))
  INTO v_investor_count, v_total_yield, v_investor_yields
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id 
    AND ifs.fund_id = ip.fund_id
    AND ifs.effective_date <= p_nav_date
    AND (ifs.end_date IS NULL OR ifs.end_date >= p_nav_date)
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'nav_date', p_nav_date,
    'gross_return_pct', p_gross_return_pct,
    'fund_aum', v_fund_aum,
    'investor_count', COALESCE(v_investor_count, 0),
    'total_yield', COALESCE(v_total_yield, 0),
    'investors', COALESCE(v_investor_yields, '[]'::jsonb)
  );
END;
$$;

-- Fix 2: Update adjust_investor_position to use upsert for AUM auto-creation
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_tx_type text,
  p_tx_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_position numeric;
  v_new_position numeric;
  v_tx_id uuid;
  v_result jsonb;
  v_aum_exists boolean;
  v_effective_tx_type text;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Validate transaction type
  IF p_tx_type NOT IN ('FIRST_INVESTMENT', 'TOP_UP', 'WITHDRAWAL', 'YIELD', 'FEE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction type: ' || p_tx_type);
  END IF;

  -- Get current position
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_current_position := COALESCE(v_current_position, 0);

  -- Validate transaction type based on current position
  v_effective_tx_type := p_tx_type;
  
  -- If position is 0 and trying to do TOP_UP, convert to FIRST_INVESTMENT
  IF v_current_position = 0 AND p_tx_type = 'TOP_UP' AND p_amount > 0 THEN
    v_effective_tx_type := 'FIRST_INVESTMENT';
    RAISE NOTICE 'Auto-converted TOP_UP to FIRST_INVESTMENT for investor % with zero balance', p_investor_id;
  END IF;

  -- Block TOP_UP if position is 0 (after potential conversion, this catches direct TOP_UP attempts)
  IF v_current_position = 0 AND v_effective_tx_type = 'TOP_UP' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot create TOP_UP when investor has zero balance in fund. Use FIRST_INVESTMENT instead.'
    );
  END IF;

  -- Check AUM exists for this fund and date - use upsert pattern to auto-create if missing
  -- FIX: Use ON CONFLICT DO UPDATE to avoid duplicate key errors
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, 0, 'transaction', 'auto_created_for_transaction', p_created_by)
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET updated_at = now();

  -- Calculate new position
  IF v_effective_tx_type IN ('FIRST_INVESTMENT', 'TOP_UP', 'YIELD', 'TRANSFER_IN', 'ADJUSTMENT') THEN
    v_new_position := v_current_position + ABS(p_amount);
  ELSIF v_effective_tx_type IN ('WITHDRAWAL', 'FEE', 'TRANSFER_OUT') THEN
    v_new_position := v_current_position - ABS(p_amount);
  ELSE
    v_new_position := v_current_position + p_amount;
  END IF;

  -- Prevent negative positions
  IF v_new_position < 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Transaction would result in negative position: current=%s, change=%s', v_current_position, p_amount)
    );
  END IF;

  -- Create transaction record
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_type,
    amount,
    tx_date,
    notes,
    created_by,
    visibility_scope
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_effective_tx_type::transaction_type,
    p_amount,
    p_tx_date,
    p_notes,
    COALESCE(p_created_by, auth.uid()),
    'all'
  )
  RETURNING id INTO v_tx_id;

  -- Update or insert position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, last_transaction_date)
  VALUES (p_investor_id, p_fund_id, v_new_position, p_tx_date)
  ON CONFLICT (investor_id, fund_id) 
  DO UPDATE SET 
    current_value = v_new_position,
    last_transaction_date = p_tx_date,
    updated_at = now();

  -- Log to audit
  INSERT INTO audit_log (entity, entity_id, action, actor_user, new_values)
  VALUES (
    'investor_positions',
    p_investor_id::text,
    'position_adjusted',
    COALESCE(p_created_by, auth.uid()),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'tx_type', v_effective_tx_type,
      'amount', p_amount,
      'old_position', v_current_position,
      'new_position', v_new_position,
      'transaction_id', v_tx_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'old_position', v_current_position,
    'new_position', v_new_position,
    'effective_tx_type', v_effective_tx_type
  );
END;
$$;
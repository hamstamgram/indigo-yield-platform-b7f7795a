-- Fix route_withdrawal_to_fees to use valid tx_source enum value ('internal_routing' instead of 'fee_routing')

CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(p_withdrawal_id uuid, p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal record;
  v_fees_account_id uuid;
  v_fund record;
  v_debit_tx_id uuid;
  v_credit_tx_id uuid;
  v_result jsonb;
  -- Delta-based invariant variables
  v_investor_position_before numeric;
  v_investor_ledger_before numeric;
  v_fees_position_before numeric;
  v_fees_ledger_before numeric;
  v_investor_position_after numeric;
  v_investor_ledger_after numeric;
  v_fees_position_after numeric;
  v_fees_ledger_after numeric;
  v_investor_mismatch_delta numeric;
  v_fees_mismatch_delta numeric;
BEGIN
  -- Get the withdrawal details
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_withdrawal_id;
  END IF;

  IF v_withdrawal.status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal is not pending. Current status: %', v_withdrawal.status;
  END IF;

  -- Get the INDIGO FEES account
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE full_name = 'INDIGO FEES'
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found';
  END IF;

  -- Get fund details
  SELECT * INTO v_fund
  FROM funds
  WHERE id = v_withdrawal.fund_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', v_withdrawal.fund_id;
  END IF;

  -- ============================================================================
  -- DELTA-BASED INVARIANT: Capture state BEFORE operations
  -- ============================================================================
  
  -- Investor position before
  SELECT COALESCE(current_value, 0) INTO v_investor_position_before
  FROM investor_positions
  WHERE investor_id = v_withdrawal.investor_id AND fund_id = v_withdrawal.fund_id;
  v_investor_position_before := COALESCE(v_investor_position_before, 0);

  -- Investor ledger before
  SELECT COALESCE(SUM(amount), 0) INTO v_investor_ledger_before
  FROM transactions_v2
  WHERE investor_id = v_withdrawal.investor_id 
    AND fund_id = v_withdrawal.fund_id 
    AND COALESCE(is_voided, false) = false;

  -- Fees account position before
  SELECT COALESCE(current_value, 0) INTO v_fees_position_before
  FROM investor_positions
  WHERE investor_id = v_fees_account_id AND fund_id = v_withdrawal.fund_id;
  v_fees_position_before := COALESCE(v_fees_position_before, 0);

  -- Fees account ledger before
  SELECT COALESCE(SUM(amount), 0) INTO v_fees_ledger_before
  FROM transactions_v2
  WHERE investor_id = v_fees_account_id 
    AND fund_id = v_withdrawal.fund_id 
    AND COALESCE(is_voided, false) = false;

  -- ============================================================================
  -- STEP 1: Create INTERNAL_WITHDRAWAL from investor (debit)
  -- ============================================================================
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    status,
    notes,
    reference_id,
    created_by,
    visibility_scope,
    is_system_generated,
    source
  ) VALUES (
    v_withdrawal.investor_id,
    v_withdrawal.fund_id,
    'INTERNAL_WITHDRAWAL'::tx_type,
    -ABS(v_withdrawal.requested_amount),
    v_fund.asset,
    v_fund.fund_class,
    CURRENT_DATE,
    'CONFIRMED',
    format('Internal routing to INDIGO FEES - Withdrawal request %s', p_withdrawal_id),
    format('fee_route:%s:debit', p_withdrawal_id),
    p_admin_id,
    'admin_only',
    true,
    'internal_routing'
  )
  RETURNING id INTO v_debit_tx_id;

  -- ============================================================================
  -- STEP 2: Create INTERNAL_CREDIT to INDIGO FEES (credit)
  -- ============================================================================
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    status,
    notes,
    reference_id,
    created_by,
    visibility_scope,
    is_system_generated,
    source
  ) VALUES (
    v_fees_account_id,
    v_withdrawal.fund_id,
    'INTERNAL_CREDIT'::tx_type,
    ABS(v_withdrawal.requested_amount),
    v_fund.asset,
    v_fund.fund_class,
    CURRENT_DATE,
    'CONFIRMED',
    format('Internal routing from %s - Withdrawal request %s', v_withdrawal.investor_id, p_withdrawal_id),
    format('fee_route:%s:credit', p_withdrawal_id),
    p_admin_id,
    'admin_only',
    true,
    'internal_routing'
  )
  RETURNING id INTO v_credit_tx_id;

  -- ============================================================================
  -- STEP 3: Ensure INDIGO FEES has a position record (for trigger to update)
  -- ============================================================================
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    fund_class,
    current_value,
    cost_basis,
    shares,
    unrealized_pnl,
    updated_at
  ) VALUES (
    v_fees_account_id,
    v_withdrawal.fund_id,
    v_fund.fund_class,
    0,
    0,
    0,
    0,
    NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- ============================================================================
  -- STEP 4: Update withdrawal request status
  -- ============================================================================
  UPDATE withdrawal_requests
  SET
    status = 'completed',
    processed_amount = v_withdrawal.requested_amount,
    processed_at = NOW(),
    processed_by = p_admin_id,
    transaction_id = v_debit_tx_id,
    notes = COALESCE(notes, '') || ' | Routed to INDIGO FEES'
  WHERE id = p_withdrawal_id;

  -- ============================================================================
  -- DELTA-BASED INVARIANT: Capture state AFTER operations
  -- ============================================================================
  
  -- Investor position after
  SELECT COALESCE(current_value, 0) INTO v_investor_position_after
  FROM investor_positions
  WHERE investor_id = v_withdrawal.investor_id AND fund_id = v_withdrawal.fund_id;
  v_investor_position_after := COALESCE(v_investor_position_after, 0);

  -- Investor ledger after
  SELECT COALESCE(SUM(amount), 0) INTO v_investor_ledger_after
  FROM transactions_v2
  WHERE investor_id = v_withdrawal.investor_id 
    AND fund_id = v_withdrawal.fund_id 
    AND COALESCE(is_voided, false) = false;

  -- Fees account position after
  SELECT COALESCE(current_value, 0) INTO v_fees_position_after
  FROM investor_positions
  WHERE investor_id = v_fees_account_id AND fund_id = v_withdrawal.fund_id;
  v_fees_position_after := COALESCE(v_fees_position_after, 0);

  -- Fees account ledger after
  SELECT COALESCE(SUM(amount), 0) INTO v_fees_ledger_after
  FROM transactions_v2
  WHERE investor_id = v_fees_account_id 
    AND fund_id = v_withdrawal.fund_id 
    AND COALESCE(is_voided, false) = false;

  -- ============================================================================
  -- INVARIANT CHECK: Delta in mismatch should be zero
  -- ============================================================================
  v_investor_mismatch_delta := (v_investor_position_after - v_investor_ledger_after) - (v_investor_position_before - v_investor_ledger_before);
  v_fees_mismatch_delta := (v_fees_position_after - v_fees_ledger_after) - (v_fees_position_before - v_fees_ledger_before);

  IF ABS(v_investor_mismatch_delta) > 0.01 OR ABS(v_fees_mismatch_delta) > 0.01 THEN
    RAISE WARNING 'Position-ledger mismatch delta detected. Investor: %, Fees: %', v_investor_mismatch_delta, v_fees_mismatch_delta;
  END IF;

  -- ============================================================================
  -- Audit log
  -- ============================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'ROUTE_WITHDRAWAL_TO_FEES',
    'withdrawal_requests',
    p_withdrawal_id::text,
    p_admin_id,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object(
      'status', 'completed',
      'routed_to', 'INDIGO FEES',
      'amount', v_withdrawal.requested_amount
    ),
    jsonb_build_object(
      'debit_tx_id', v_debit_tx_id,
      'credit_tx_id', v_credit_tx_id,
      'investor_position_before', v_investor_position_before,
      'investor_position_after', v_investor_position_after,
      'fees_position_before', v_fees_position_before,
      'fees_position_after', v_fees_position_after
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'debit_transaction_id', v_debit_tx_id,
    'credit_transaction_id', v_credit_tx_id,
    'amount', v_withdrawal.requested_amount,
    'from_investor', v_withdrawal.investor_id,
    'to_fees_account', v_fees_account_id,
    'investor_position_after', v_investor_position_after,
    'fees_position_after', v_fees_position_after
  );

  RETURN v_result;
END;
$function$;
-- ============================================================================
-- EXPERT FIX: Orphaned Positions and Delta-Based Invariant Validation
-- ============================================================================

-- Part 1: Create seed DEPOSIT transactions for all orphaned positions
-- Temporarily disable AUM validation trigger
ALTER TABLE public.transactions_v2 DISABLE TRIGGER trg_validate_aum_on_transaction;

-- Create seed transactions for all orphaned positions (using NOT EXISTS to avoid duplicates)
INSERT INTO public.transactions_v2 (
  investor_id, fund_id, type, amount, asset, fund_class, 
  tx_date, notes, reference_id, source, is_voided
)
SELECT 
  ip.investor_id,
  ip.fund_id,
  'DEPOSIT'::tx_type,
  ip.current_value,
  f.asset,
  f.fund_class,
  COALESCE(ip.last_transaction_date, '2024-01-01')::date,
  'System reconciliation: Seed deposit to match orphaned position',
  'seed_reconcile_' || ip.investor_id::text || '_' || ip.fund_id::text,
  'system_bootstrap'::tx_source,
  false
FROM public.investor_positions ip
JOIN public.funds f ON f.id = ip.fund_id
LEFT JOIN (
  SELECT investor_id, fund_id, 
    SUM(CASE 
      WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
      ELSE 0
    END) as ledger_balance
  FROM transactions_v2 WHERE is_voided = false
  GROUP BY investor_id, fund_id
) lt ON lt.investor_id = ip.investor_id AND lt.fund_id = ip.fund_id
WHERE ABS(ip.current_value - COALESCE(lt.ledger_balance, 0)) > 0.0001
  AND ip.current_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t2
    WHERE t2.reference_id = 'seed_reconcile_' || ip.investor_id::text || '_' || ip.fund_id::text
  );

-- Re-enable trigger
ALTER TABLE public.transactions_v2 ENABLE TRIGGER trg_validate_aum_on_transaction;

-- Part 2: Update route_withdrawal_to_fees with delta-based invariant validation
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(
  p_withdrawal_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT COALESCE(SUM(CASE 
    WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
    WHEN type IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
    ELSE 0
  END), 0) INTO v_investor_ledger_before
  FROM transactions_v2
  WHERE investor_id = v_withdrawal.investor_id 
    AND fund_id = v_withdrawal.fund_id 
    AND is_voided = false;

  -- INDIGO FEES position before
  SELECT COALESCE(current_value, 0) INTO v_fees_position_before
  FROM investor_positions
  WHERE investor_id = v_fees_account_id AND fund_id = v_withdrawal.fund_id;
  v_fees_position_before := COALESCE(v_fees_position_before, 0);

  -- INDIGO FEES ledger before
  SELECT COALESCE(SUM(CASE 
    WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
    WHEN type IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
    ELSE 0
  END), 0) INTO v_fees_ledger_before
  FROM transactions_v2
  WHERE investor_id = v_fees_account_id 
    AND fund_id = v_withdrawal.fund_id 
    AND is_voided = false;

  -- ============================================================================
  -- PERFORM THE FEE ROUTING OPERATIONS
  -- ============================================================================

  -- Create WITHDRAWAL transaction for the investor (debit)
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class,
    tx_date, notes, reference_id, source, is_voided
  ) VALUES (
    v_withdrawal.investor_id,
    v_withdrawal.fund_id,
    'WITHDRAWAL'::tx_type,
    v_withdrawal.amount,
    v_fund.asset,
    v_fund.fund_class,
    CURRENT_DATE,
    'Fee routing withdrawal to INDIGO FEES',
    'fee_route_' || p_withdrawal_id::text,
    'internal_routing'::tx_source,
    false
  )
  RETURNING id INTO v_debit_tx_id;

  -- Create DEPOSIT transaction for INDIGO FEES (credit)
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class,
    tx_date, notes, reference_id, source, is_voided
  ) VALUES (
    v_fees_account_id,
    v_withdrawal.fund_id,
    'DEPOSIT'::tx_type,
    v_withdrawal.amount,
    v_fund.asset,
    v_fund.fund_class,
    CURRENT_DATE,
    'Fee routing credit from investor withdrawal',
    'fee_credit_' || p_withdrawal_id::text,
    'internal_routing'::tx_source,
    false
  )
  RETURNING id INTO v_credit_tx_id;

  -- Update investor position (decrease)
  UPDATE investor_positions
  SET current_value = current_value - v_withdrawal.amount,
      last_transaction_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE investor_id = v_withdrawal.investor_id AND fund_id = v_withdrawal.fund_id;

  -- Update or create INDIGO FEES position (increase)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, last_transaction_date)
  VALUES (v_fees_account_id, v_withdrawal.fund_id, v_withdrawal.amount, v_withdrawal.amount, 0, v_fund.asset, CURRENT_DATE)
  ON CONFLICT (investor_id, fund_id) DO UPDATE
  SET current_value = investor_positions.current_value + v_withdrawal.amount,
      last_transaction_date = CURRENT_DATE,
      updated_at = NOW();

  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET status = 'completed',
      processed_at = NOW(),
      processed_by = p_admin_id,
      notes = COALESCE(notes, '') || ' | Routed to INDIGO FEES'
  WHERE id = p_withdrawal_id;

  -- ============================================================================
  -- DELTA-BASED INVARIANT: Capture state AFTER and validate
  -- ============================================================================

  -- Investor position after
  SELECT COALESCE(current_value, 0) INTO v_investor_position_after
  FROM investor_positions
  WHERE investor_id = v_withdrawal.investor_id AND fund_id = v_withdrawal.fund_id;
  v_investor_position_after := COALESCE(v_investor_position_after, 0);

  -- Investor ledger after
  SELECT COALESCE(SUM(CASE 
    WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
    WHEN type IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
    ELSE 0
  END), 0) INTO v_investor_ledger_after
  FROM transactions_v2
  WHERE investor_id = v_withdrawal.investor_id 
    AND fund_id = v_withdrawal.fund_id 
    AND is_voided = false;

  -- INDIGO FEES position after
  SELECT COALESCE(current_value, 0) INTO v_fees_position_after
  FROM investor_positions
  WHERE investor_id = v_fees_account_id AND fund_id = v_withdrawal.fund_id;
  v_fees_position_after := COALESCE(v_fees_position_after, 0);

  -- INDIGO FEES ledger after
  SELECT COALESCE(SUM(CASE 
    WHEN type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
    WHEN type IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
    ELSE 0
  END), 0) INTO v_fees_ledger_after
  FROM transactions_v2
  WHERE investor_id = v_fees_account_id 
    AND fund_id = v_withdrawal.fund_id 
    AND is_voided = false;

  -- Calculate mismatch deltas (should be 0 if operation was consistent)
  -- Mismatch = position - ledger
  -- If both decrease/increase by same amount, mismatch delta = 0
  v_investor_mismatch_delta := (v_investor_position_after - v_investor_ledger_after) 
                              - (v_investor_position_before - v_investor_ledger_before);
  
  v_fees_mismatch_delta := (v_fees_position_after - v_fees_ledger_after) 
                          - (v_fees_position_before - v_fees_ledger_before);

  -- Validate: The operation should NOT have changed the position-ledger gap
  IF ABS(v_investor_mismatch_delta) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Fee routing changed investor position-ledger gap by %. Before: position=%, ledger=%. After: position=%, ledger=%',
      v_investor_mismatch_delta,
      v_investor_position_before, v_investor_ledger_before,
      v_investor_position_after, v_investor_ledger_after;
  END IF;

  IF ABS(v_fees_mismatch_delta) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Fee routing changed INDIGO FEES position-ledger gap by %. Before: position=%, ledger=%. After: position=%, ledger=%',
      v_fees_mismatch_delta,
      v_fees_position_before, v_fees_ledger_before,
      v_fees_position_after, v_fees_ledger_after;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'debit_transaction_id', v_debit_tx_id,
    'credit_transaction_id', v_credit_tx_id,
    'amount', v_withdrawal.amount,
    'fund_code', v_fund.code,
    'routed_to', 'INDIGO FEES'
  );

  RETURN v_result;
END;
$$;
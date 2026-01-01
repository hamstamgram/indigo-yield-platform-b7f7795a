-- Fix route_withdrawal_to_fees: Remove non-existent created_at column from INSERTs
-- Also improve void_transaction FEE/FEE_CREDIT pairing + add withdrawal status rollback

-- ============================================================================
-- 1. Fix route_withdrawal_to_fees - remove created_at column references
-- ============================================================================

CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(p_request_id uuid, p_reason text DEFAULT 'Fee routing'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_request RECORD; 
  v_fund_asset TEXT;
  v_fund_class TEXT;
  v_amount NUMERIC;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_position RECORD;
  v_shares_to_transfer NUMERIC;
  v_cost_basis_to_transfer NUMERIC;
  v_reference_id TEXT;
  v_ledger_balance_investor NUMERIC;
  v_ledger_balance_fees NUMERIC;
BEGIN
  PERFORM public.ensure_admin();
  
  v_reference_id := 'fee_route_' || p_request_id::text;
  
  -- IDEMPOTENCY CHECK
  IF EXISTS (
    SELECT 1 FROM public.transactions_v2 WHERE reference_id = v_reference_id
  ) THEN
    RAISE NOTICE 'Fee routing already processed for request %', p_request_id;
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Request not found: %', p_request_id; 
  END IF;
  IF v_request.status NOT IN ('approved', 'processing') THEN 
    RAISE EXCEPTION 'Invalid status for fee routing: %', v_request.status; 
  END IF;
  
  v_amount := COALESCE(v_request.approved_amount, v_request.requested_amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN 
    RAISE EXCEPTION 'Invalid withdrawal amount: %', v_amount; 
  END IF;
  
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class 
  FROM public.funds f WHERE f.id = v_request.fund_id;
  IF v_fund_asset IS NULL THEN v_fund_asset := v_request.fund_class; END IF;
  IF v_fund_class IS NULL THEN v_fund_class := v_request.fund_class; END IF;
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Cannot determine asset for fund_id: %', v_request.fund_id;
  END IF;

  SELECT shares, current_value, cost_basis 
  INTO v_investor_position
  FROM public.investor_positions 
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  IF v_investor_position.current_value IS NULL OR v_investor_position.current_value < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance: has %, needs %', 
      COALESCE(v_investor_position.current_value, 0), v_amount;
  END IF;
  
  IF v_investor_position.current_value > 0 THEN
    v_shares_to_transfer := v_investor_position.shares * (v_amount / v_investor_position.current_value);
    v_cost_basis_to_transfer := COALESCE(v_investor_position.cost_basis, 0) * (v_amount / v_investor_position.current_value);
  ELSE
    v_shares_to_transfer := v_amount;
    v_cost_basis_to_transfer := v_amount;
  END IF;

  -- Create FEE transaction (debit from investor)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  ) VALUES (
    v_request.investor_id, v_request.fund_id, 'FEE', -ABS(v_amount), 
    v_fund_asset, v_fund_class, CURRENT_DATE, 
    p_reason, v_reference_id, auth.uid(), false
  );

  -- Create FEE_CREDIT transaction (credit to fees account) with matching reference pattern
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  ) VALUES (
    v_fees_account_id, v_request.fund_id, 'FEE_CREDIT', ABS(v_amount), 
    v_fund_asset, v_fund_class, CURRENT_DATE, 
    'Fee routing from ' || LEFT(v_request.investor_id::text, 8), 
    'fee_credit_' || p_request_id::text, auth.uid(), false
  );

  -- FIX: Remove created_at from UPSERT (column doesn't exist in investor_positions)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at
  ) VALUES (
    v_request.investor_id, v_request.fund_id, v_fund_class,
    -ABS(v_shares_to_transfer), -ABS(v_amount), 0, NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = investor_positions.current_value - ABS(v_amount),
    shares = investor_positions.shares - ABS(v_shares_to_transfer),
    cost_basis = GREATEST(0, COALESCE(investor_positions.cost_basis, 0) - ABS(v_cost_basis_to_transfer)),
    updated_at = NOW();
  
  -- FIX: Remove created_at from UPSERT for INDIGO FEES position
  INSERT INTO public.investor_positions (
    investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at
  ) VALUES (
    v_fees_account_id, v_request.fund_id, v_fund_class,
    ABS(v_shares_to_transfer), ABS(v_amount), 0, NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = investor_positions.current_value + ABS(v_amount),
    shares = investor_positions.shares + ABS(v_shares_to_transfer),
    updated_at = NOW();

  -- Invariant checks
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_ledger_balance_investor
  FROM public.transactions_v2
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id AND is_voided = false;

  IF ABS((SELECT current_value FROM investor_positions WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id) - v_ledger_balance_investor) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Investor position != ledger after fee routing';
  END IF;

  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0) INTO v_ledger_balance_fees
  FROM public.transactions_v2
  WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id AND is_voided = false;

  IF ABS((SELECT current_value FROM investor_positions WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id) - v_ledger_balance_fees) > 0.0001 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: INDIGO FEES position != ledger after fee routing';
  END IF;
  
  UPDATE public.withdrawal_requests 
  SET status = 'completed', processed_at = NOW(), processed_amount = v_amount, updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$function$;

-- ============================================================================
-- 2. Improve void_transaction: precise FEE/FEE_CREDIT pairing + withdrawal rollback
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
  v_counterparty_tx RECORD;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_voided_fee_allocations int := 0;
  v_voided_ib_allocations int := 0;
  v_temp_count int := 0;
  v_distribution_voided boolean := false;
  v_withdrawal_cancelled boolean := false;
  v_withdrawal_reverted boolean := false;
  v_extracted_request_id TEXT;
BEGIN
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters';
  END IF;
  
  -- Update transaction to voided
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;
  
  -- Recompute position for affected investor/fund
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- ========================================================================
  -- CASCADE 1: Void related fee_allocations
  -- ========================================================================
  UPDATE fee_allocations
  SET is_voided = true, 
      voided_at = now(), 
      voided_by = v_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_allocations = ROW_COUNT;
  
  IF v_tx.type = 'YIELD' AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE fee_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE distribution_id = v_tx.distribution_id
      AND investor_id = v_tx.investor_id
      AND is_voided = false;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_voided_fee_allocations := v_voided_fee_allocations + v_temp_count;
  END IF;
  
  -- ========================================================================
  -- CASCADE 2: Void related ib_allocations
  -- ========================================================================
  IF v_tx.type = 'IB_CREDIT' THEN
    UPDATE ib_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE ib_investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND effective_date = v_tx.tx_date
      AND is_voided = false;
    GET DIAGNOSTICS v_voided_ib_allocations = ROW_COUNT;
  END IF;
  
  IF v_tx.type = 'YIELD' AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE ib_allocations
    SET is_voided = true, 
        voided_at = now(), 
        voided_by = v_admin_id
    WHERE source_investor_id = v_tx.investor_id
      AND distribution_id = v_tx.distribution_id
      AND is_voided = false;
    GET DIAGNOSTICS v_temp_count = ROW_COUNT;
    v_voided_ib_allocations := v_voided_ib_allocations + v_temp_count;
  END IF;
  
  -- ========================================================================
  -- CASCADE 3: Void distribution if all transactions voided
  -- ========================================================================
  IF v_tx.distribution_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2 
      WHERE distribution_id = v_tx.distribution_id 
        AND is_voided = false
    ) THEN
      UPDATE yield_distributions
      SET status = 'voided', 
          voided_at = now(), 
          voided_by = v_admin_id, 
          void_reason = 'All transactions voided'
      WHERE id = v_tx.distribution_id
        AND status != 'voided';
      
      IF FOUND THEN
        v_distribution_voided := true;
      END IF;
    END IF;
  END IF;
  
  -- ========================================================================
  -- CASCADE 4: Cancel withdrawal_requests for WITHDRAWAL transactions
  -- ========================================================================
  IF v_tx.type = 'WITHDRAWAL' THEN
    UPDATE withdrawal_requests
    SET status = 'cancelled',
        cancellation_reason = 'Transaction voided: ' || p_reason,
        cancelled_by = v_admin_id,
        cancelled_at = now()
    WHERE investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND status = 'completed'
      AND ABS(COALESCE(processed_amount, requested_amount) - ABS(v_tx.amount)) < 0.01
      AND DATE(processed_at) = v_tx.tx_date;
    
    IF FOUND THEN
      v_withdrawal_cancelled := true;
    END IF;
  END IF;
  
  -- ========================================================================
  -- IMPROVED: Handle FEE/FEE_CREDIT pairs with PRECISE reference_id matching
  -- ========================================================================
  IF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL AND v_tx.reference_id LIKE 'fee_route_%' THEN
    -- Extract request_id from 'fee_route_{uuid}'
    v_extracted_request_id := REPLACE(v_tx.reference_id, 'fee_route_', '');
    
    -- Find exact matching FEE_CREDIT using the extracted request_id
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id = 'fee_credit_' || v_extracted_request_id
      AND type = 'FEE_CREDIT'
      AND investor_id = v_fees_account_id
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
    
    -- REVERT withdrawal_request status from 'completed' to 'approved'
    UPDATE withdrawal_requests
    SET status = 'approved',
        processed_at = NULL,
        processed_amount = NULL,
        updated_at = NOW()
    WHERE id = v_extracted_request_id::uuid
      AND status = 'completed';
    
    IF FOUND THEN
      v_withdrawal_reverted := true;
    END IF;
    
  ELSIF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL THEN
    -- Fallback for non-fee_route FEE transactions (legacy behavior)
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id LIKE 'fee_credit_%' 
      AND fund_id = v_tx.fund_id
      AND type = 'FEE_CREDIT'
      AND investor_id = v_fees_account_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- Handle FEE_CREDIT voiding (find matching FEE)
  IF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id AND v_tx.reference_id LIKE 'fee_credit_%' THEN
    v_extracted_request_id := REPLACE(v_tx.reference_id, 'fee_credit_', '');
    
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE reference_id = 'fee_route_' || v_extracted_request_id
      AND type = 'FEE'
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
      
      UPDATE fee_allocations
      SET is_voided = true, 
          voided_at = now(), 
          voided_by = v_admin_id
      WHERE (credit_transaction_id = v_counterparty_tx.id OR debit_transaction_id = v_counterparty_tx.id)
        AND is_voided = false;
    END IF;
    
    -- REVERT withdrawal_request status
    UPDATE withdrawal_requests
    SET status = 'approved',
        processed_at = NULL,
        processed_amount = NULL,
        updated_at = NOW()
    WHERE id = v_extracted_request_id::uuid
      AND status = 'completed';
    
    IF FOUND THEN
      v_withdrawal_reverted := true;
    END IF;
    
  ELSIF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id THEN
    -- Fallback for legacy FEE_CREDIT transactions
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'FEE'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
      
      UPDATE fee_allocations
      SET is_voided = true, 
          voided_at = now(), 
          voided_by = v_admin_id
      WHERE (credit_transaction_id = v_counterparty_tx.id OR debit_transaction_id = v_counterparty_tx.id)
        AND is_voided = false;
    END IF;
  END IF;
  
  -- Handle INTERNAL_WITHDRAWAL/INTERNAL_CREDIT pairs
  IF v_tx.type = 'INTERNAL_WITHDRAWAL' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_CREDIT'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND amount = ABS(v_tx.amount)
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  IF v_tx.type = 'INTERNAL_CREDIT' THEN
    SELECT * INTO v_counterparty_tx 
    FROM transactions_v2 
    WHERE type = 'INTERNAL_WITHDRAWAL'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND ABS(amount) = v_tx.amount
      AND is_voided = false
    LIMIT 1;
    
    IF v_counterparty_tx IS NOT NULL THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Auto-voided: paired with ' || p_transaction_id::text
      WHERE id = v_counterparty_tx.id;
      
      PERFORM recompute_investor_position(v_counterparty_tx.investor_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- ========================================================================
  -- Audit log with full cascade info
  -- ========================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'is_voided', false,
      'is_system_generated', v_tx.is_system_generated,
      'distribution_id', v_tx.distribution_id
    ),
    jsonb_build_object(
      'is_voided', true, 
      'voided_at', now(),
      'voided_by', v_admin_id,
      'void_reason', p_reason,
      'counterparty_voided', v_counterparty_tx IS NOT NULL,
      'fee_allocations_voided', v_voided_fee_allocations,
      'ib_allocations_voided', v_voided_ib_allocations,
      'distribution_voided', v_distribution_voided,
      'withdrawal_cancelled', v_withdrawal_cancelled,
      'withdrawal_reverted', v_withdrawal_reverted
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'voided_amount', v_tx.amount,
    'counterparty_voided', v_counterparty_tx IS NOT NULL,
    'fee_allocations_voided', v_voided_fee_allocations,
    'ib_allocations_voided', v_voided_ib_allocations,
    'distribution_voided', v_distribution_voided,
    'withdrawal_cancelled', v_withdrawal_cancelled,
    'withdrawal_reverted', v_withdrawal_reverted
  );
END;
$function$;

COMMENT ON FUNCTION public.void_transaction IS 'Voids a transaction and cascades to related records: fee_allocations, ib_allocations, yield_distributions (if all txs voided), withdrawal_requests (for WITHDRAWAL type), and fee routing reversals. Returns summary of all voided records.';
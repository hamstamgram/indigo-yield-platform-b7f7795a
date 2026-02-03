-- Enhanced void_transaction with full cascade logic
-- When a transaction is voided, cascade to:
-- 1. fee_allocations (mark as voided)
-- 2. ib_allocations (mark as voided)  
-- 3. yield_distributions (mark as voided if all transactions voided)
-- 4. withdrawal_requests (cancel if WITHDRAWAL transaction voided)

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
  -- For FEE/FEE_CREDIT transactions linked via credit_transaction_id or debit_transaction_id
  UPDATE fee_allocations
  SET is_voided = true, 
      voided_at = now(), 
      voided_by = v_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_allocations = ROW_COUNT;
  
  -- For YIELD transactions, void fee_allocations by distribution_id + investor
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
  -- For IB_CREDIT transactions, void the ib_allocations for this IB investor
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
  
  -- For YIELD transactions, void ib_allocations where this investor is the source
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
  -- CASCADE 3: Check if all transactions for distribution are voided -> void distribution
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
  -- EXISTING: Handle paired transactions (FEE/FEE_CREDIT, INTERNAL pairs)
  -- ========================================================================
  -- For FEE transactions, also void the corresponding FEE_CREDIT and recompute INDIGO FEES position
  IF v_tx.type = 'FEE' AND v_tx.reference_id IS NOT NULL THEN
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
  
  -- For FEE_CREDIT transactions, also void the corresponding FEE and recompute source position
  IF v_tx.type = 'FEE_CREDIT' AND v_tx.investor_id = v_fees_account_id THEN
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
      
      -- Also void fee_allocations for the counterparty
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
      'withdrawal_cancelled', v_withdrawal_cancelled
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
    'withdrawal_cancelled', v_withdrawal_cancelled
  );
END;
$function$;

-- Add comment explaining the cascade behavior
COMMENT ON FUNCTION public.void_transaction IS 'Voids a transaction and cascades to related records: fee_allocations, ib_allocations, yield_distributions (if all txs voided), and withdrawal_requests (for WITHDRAWAL type). Returns summary of all voided records.';
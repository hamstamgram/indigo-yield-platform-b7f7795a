-- Block voiding processed/completed withdrawals
-- Problem: Voiding a completed withdrawal reverts status but funds already left
-- Solution: Block void for WITHDRAWAL transactions linked to completed withdrawal_requests

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
  v_withdrawal_id uuid;
  v_voided_allocations int := 0;
  v_updated_nav boolean := false;
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
  
  -- =========================================================================
  -- BLOCK: Cannot void completed/processed withdrawals
  -- =========================================================================
  IF v_tx.type = 'WITHDRAWAL' AND v_tx.reference_id IS NOT NULL THEN
    -- Extract withdrawal request ID from reference
    IF v_tx.reference_id LIKE 'WD-%' THEN
      v_withdrawal_id := SUBSTRING(v_tx.reference_id FROM 4)::uuid;
    ELSIF v_tx.reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_withdrawal_id := v_tx.reference_id::uuid;
    END IF;
    
    -- Check if withdrawal request is completed - if so, block the void
    IF v_withdrawal_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM withdrawal_requests 
        WHERE id = v_withdrawal_id 
        AND status = 'completed'
      ) THEN
        RAISE EXCEPTION 'Cannot void a processed withdrawal. Funds have already left the platform. Use a manual DEPOSIT transaction to record a refund if needed.';
      END IF;
    END IF;
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
  
  -- =========================================================================
  -- CASCADE 1: Update daily_nav.aum and flow metrics
  -- =========================================================================
  UPDATE daily_nav
  SET 
    aum = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investor_positions
      WHERE fund_id = v_tx.fund_id
    ),
    total_inflows = CASE 
      WHEN v_tx.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT') 
      THEN GREATEST(0, COALESCE(total_inflows, 0) - ABS(v_tx.amount))
      ELSE total_inflows
    END,
    total_outflows = CASE 
      WHEN v_tx.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL')
      THEN GREATEST(0, COALESCE(total_outflows, 0) - ABS(v_tx.amount))
      ELSE total_outflows
    END
  WHERE fund_id = v_tx.fund_id
    AND nav_date = v_tx.tx_date;
  
  IF FOUND THEN
    v_updated_nav := true;
  END IF;

  -- Also update fund_daily_aum
  UPDATE fund_daily_aum
  SET 
    total_aum = (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investor_positions
      WHERE fund_id = v_tx.fund_id
    ),
    updated_at = now(),
    updated_by = v_admin_id
  WHERE fund_id = v_tx.fund_id
    AND aum_date = v_tx.tx_date
    AND NOT is_voided;

  -- =========================================================================
  -- CASCADE 2: Handle withdrawal_requests status reversion (non-completed only)
  -- =========================================================================
  IF v_tx.type = 'WITHDRAWAL' AND v_tx.reference_id IS NOT NULL THEN
    -- Reset withdrawal_id for the cascade handling
    v_withdrawal_id := NULL;
    
    IF v_tx.reference_id LIKE 'WD-%' THEN
      v_withdrawal_id := SUBSTRING(v_tx.reference_id FROM 4)::uuid;
    ELSIF v_tx.reference_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_withdrawal_id := v_tx.reference_id::uuid;
    END IF;
    
    -- Only update non-completed withdrawals (processing status)
    IF v_withdrawal_id IS NOT NULL THEN
      UPDATE withdrawal_requests
      SET 
        status = 'approved',
        processed_at = NULL,
        processed_amount = NULL,
        admin_notes = COALESCE(admin_notes || E'\n', '') || 
          'Transaction voided: ' || p_reason || ' at ' || now()::text
      WHERE id = v_withdrawal_id
        AND status = 'processing';
    END IF;
  END IF;
  
  -- Handle fee_route withdrawals
  IF v_tx.reference_id LIKE 'fee_route_%' THEN
    v_withdrawal_id := SUBSTRING(v_tx.reference_id FROM 11)::uuid;
    
    UPDATE withdrawal_requests
    SET 
      status = 'voided',
      admin_notes = COALESCE(admin_notes || E'\n', '') || 
        'Voided: ' || p_reason || ' at ' || now()::text
    WHERE id = v_withdrawal_id;
  END IF;

  -- =========================================================================
  -- CASCADE 3: Void related IB allocations
  -- =========================================================================
  IF v_tx.type = 'IB_CREDIT' THEN
    UPDATE ib_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE ib_investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND effective_date = v_tx.tx_date
      AND ABS(ib_fee_amount - v_tx.amount) < 0.01
      AND NOT COALESCE(is_voided, false);
    
    GET DIAGNOSTICS v_voided_allocations = ROW_COUNT;
  END IF;

  -- =========================================================================
  -- CASCADE 4: Void related fee allocations
  -- =========================================================================
  IF v_tx.type = 'FEE' THEN
    UPDATE fee_allocations
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id
    WHERE investor_id = v_tx.investor_id
      AND fund_id = v_tx.fund_id
      AND period_end >= v_tx.tx_date
      AND period_start <= v_tx.tx_date
      AND ABS(fee_amount - ABS(v_tx.amount)) < 0.01
      AND NOT COALESCE(is_voided, false);
    
    GET DIAGNOSTICS v_voided_allocations = ROW_COUNT;
  END IF;

  -- =========================================================================
  -- CASCADE 5: Handle counterparty transactions (FEE/FEE_CREDIT pairs)
  -- =========================================================================
  IF v_tx.type IN ('FEE', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'INTERNAL_WITHDRAWAL') THEN
    -- Find and void the counterparty transaction if exists
    SELECT * INTO v_counterparty_tx
    FROM transactions_v2
    WHERE fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND investor_id = v_fees_account_id
      AND ABS(amount - v_tx.amount) < 0.01
      AND NOT is_voided
      AND id != v_tx.id
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = now(),
          voided_by = v_admin_id,
          void_reason = 'Cascade void from ' || p_transaction_id::text || ': ' || p_reason
      WHERE id = v_counterparty_tx.id;
      
      -- Recompute INDIGO FEES position
      PERFORM recompute_investor_position(v_fees_account_id, v_tx.fund_id);
    END IF;
  END IF;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'type', v_tx.type,
      'amount', v_tx.amount,
      'asset', v_tx.asset,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id
    ),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_at', now()
    ),
    jsonb_build_object(
      'voided_allocations', v_voided_allocations,
      'updated_nav', v_updated_nav
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'voided_at', now(),
    'cascaded_allocations', v_voided_allocations,
    'nav_updated', v_updated_nav
  );
END;
$function$;
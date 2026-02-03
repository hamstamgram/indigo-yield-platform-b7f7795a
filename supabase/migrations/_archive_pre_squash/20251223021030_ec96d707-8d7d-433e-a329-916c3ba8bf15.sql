-- P0 Backend Fixes Migration
-- 1. Block system transaction void in void_transaction RPC
-- 2. Add transaction type validation (FIRST_INVESTMENT vs TOP_UP) 
-- 3. Add AUM check to adjust_investor_position

-- =============================================================================
-- Fix 1: Block voiding system-generated transactions
-- =============================================================================
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
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
  
  -- BLOCK SYSTEM GENERATED TRANSACTIONS
  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot void system-generated transactions. These are created by yield distributions, fee allocations, or other automated processes.';
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
  
  -- Audit log
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
      'is_system_generated', v_tx.is_system_generated
    ),
    jsonb_build_object(
      'is_voided', true, 
      'voided_at', now(),
      'voided_by', v_admin_id,
      'void_reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'voided_amount', v_tx.amount
  );
END;
$$;

-- =============================================================================
-- Fix 2 & 3: Enhanced adjust_investor_position with type validation and AUM check
-- =============================================================================
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text,
  p_admin_id uuid,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE
) RETURNS TABLE (
  investor_id uuid,
  fund_id uuid,
  previous_balance numeric,
  new_balance numeric
) AS $$
DECLARE
  v_prev numeric;
  v_new numeric;
  v_asset text;
  v_has_aum boolean;
  v_is_first_investment boolean;
BEGIN
  -- Get current position value (or null if none)
  SELECT current_value INTO v_prev
  FROM investor_positions
  WHERE investor_positions.investor_id = p_investor_id 
    AND investor_positions.fund_id = p_fund_id
  FOR UPDATE;

  -- Determine if this is a first investment scenario
  v_is_first_investment := (v_prev IS NULL OR v_prev = 0);

  -- =========================================================================
  -- FIX 2: Transaction Type Validation
  -- =========================================================================
  IF p_delta > 0 THEN
    -- This is a deposit/investment type transaction
    IF v_is_first_investment THEN
      -- Must use FIRST_INVESTMENT or DEPOSIT for zero-balance investors
      IF p_tx_type = 'TOP_UP' THEN
        RAISE EXCEPTION 'Cannot use TOP_UP for investor with zero balance. Use FIRST_INVESTMENT or DEPOSIT instead.';
      END IF;
    ELSE
      -- Has existing balance - can use TOP_UP, but auto-convert FIRST_INVESTMENT to TOP_UP
      IF p_tx_type = 'FIRST_INVESTMENT' AND v_prev > 0 THEN
        p_tx_type := 'TOP_UP';
        RAISE NOTICE 'Auto-converted FIRST_INVESTMENT to TOP_UP since investor already has balance of %', v_prev;
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- FIX 3: AUM Existence Check
  -- =========================================================================
  SELECT EXISTS(
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_daily_aum.fund_id = p_fund_id 
      AND fund_daily_aum.aum_date = p_tx_date
  ) INTO v_has_aum;

  IF NOT v_has_aum THEN
    -- Auto-create AUM record with source 'transaction' to allow the transaction
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose)
    SELECT 
      p_fund_id, 
      p_tx_date, 
      COALESCE((
        SELECT total_aum 
        FROM fund_daily_aum 
        WHERE fund_id = p_fund_id AND aum_date < p_tx_date 
        ORDER BY aum_date DESC 
        LIMIT 1
      ), 0),
      'transaction',
      'transaction'
    ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;
    
    RAISE NOTICE 'Auto-created AUM record for fund % on date %', p_fund_id, p_tx_date;
  END IF;

  -- Initialize position if needed
  IF v_prev IS NULL THEN
    v_prev := 0;
    INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
    SELECT p_investor_id, p_fund_id, f.asset, p_delta, p_delta, p_delta, now()
    FROM funds f WHERE f.id = p_fund_id
    ON CONFLICT (investor_id, fund_id) DO NOTHING;
  END IF;

  -- Get fund asset
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found %', p_fund_id;
  END IF;

  v_new := coalesce(v_prev,0) + coalesce(p_delta,0);

  -- Record transaction with proper type
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, asset, fund_class,
    amount, tx_date, value_date, reference_id, notes, created_by, created_at
  ) VALUES (
    gen_random_uuid(), p_investor_id, p_fund_id, p_tx_type, v_asset, v_asset,
    p_delta, p_tx_date, p_tx_date, 'position_adjustment', coalesce(p_note, ''), p_admin_id, now()
  );

  -- Update position
  UPDATE investor_positions ip
  SET current_value = v_new,
      shares = ip.shares + coalesce(p_delta,0),
      updated_at = now()
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;

  -- Return result
  investor_id := p_investor_id;
  fund_id := p_fund_id;
  previous_balance := coalesce(v_prev,0);
  new_balance := v_new;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

-- Grant permissions for the new signature
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date) TO authenticated, service_role;